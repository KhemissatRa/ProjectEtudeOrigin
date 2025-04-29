// server.js (Syntaxe ES Module)
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import Stripe from "stripe"; // Import de la classe Stripe
import sgMail from "@sendgrid/mail"; // <-- AJOUTÉ : Import SendGrid
// import puppeteer from 'puppeteer'; // Supprimé
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { promises as fs } from "fs"; // Ré-activé pour mkdir et vérifier existence
import path from "path"; // Ré-activé pour join
// Importer multer
import multer from "multer";
import { PDFDocument } from "pdf-lib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fsSync from "fs";
import sharp from "sharp"; // Import de sharp pour optimisation d'images

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") }); // Chemin explicite

/* --- Debugging Logs Supprimés ---
console.log('--- Chargement des variables d\'environnement ---');
console.log(`Répertoire de travail actuel (cwd): ${process.cwd()}`);
console.log(`Fichier .env cherché dans: ${join(dirname(fileURLToPath(import.meta.url)), '.env')}`);
console.log(`STRIPE_SECRET_KEY chargé: ${process.env.STRIPE_SECRET_KEY ? 'Oui' : 'Non'}`); 
console.log(`STRIPE_WEBHOOK_SECRET chargé: ${process.env.STRIPE_WEBHOOK_SECRET ? 'Oui' : 'Non'}`);
console.log(`FRONTEND_URL chargé: ${process.env.FRONTEND_URL}`);
console.log('-----------------------------------------------');
*/

// Configuration pour le répertoire d'upload
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pdfsDir = path.join(__dirname, "pdfs");

// Créer le répertoire pdfs s'il n'existe pas
fs.mkdir(pdfsDir, { recursive: true }).catch(console.error);

// Utiliser memoryStorage pour avoir accès à req.body plus tôt
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // Limite augmentée à 500MB
  fileFilter: function (req, file, cb) {
    // Accepter PDF pour le champ 'file'
    if (file.fieldname === "file" && file.mimetype === "application/pdf") {
      cb(null, true);
    }
    // Accepter PNG ou JPEG pour le champ 'previewImage'
    else if (
      file.fieldname === "previewImage" &&
      (file.mimetype === "image/png" || file.mimetype === "image/jpeg")
    ) {
      cb(null, true);
    }
    // Sinon, refuser
    else {
      cb(new Error("Seuls les fichiers PDF (file) et images PNG/JPEG (previewImage) sont autorisés"));
    }
  },
});

// Vérifier si la clé Stripe est bien chargée
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const frontendUrl = process.env.FRONTEND_URL;

/* Vérification des variables d'environnement Supprimée
if (!stripeSecretKey || !stripeWebhookSecret || !frontendUrl) {
    console.error('Erreur : Variables d\'environnement manquantes (.env). Vérifiez STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, FRONTEND_URL');
    process.exit(1);
}
*/

// Configure SendGrid
const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
} else {
  console.warn(
    "⚠️ Attention : Clé API SendGrid (SENDGRID_API_KEY) non trouvée dans .env. L'envoi d'emails sera désactivé."
  );
}

// --> AJOUTER L'INITIALISATION DE STRIPE ICI <--
const stripe = new Stripe(stripeSecretKey);

const app = express();
const port = process.env.PORT || 3001;

// Configuration CORS (Port 5173 corrigé)
const corsOptions = {
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL
    : "http://localhost:5173",
  credentials: true,
};

app.use(cors(corsOptions));

// --- Middleware & Routes ---

// 1. Route Webhook Stripe (AVANT les parsers globaux)
// Le middleware express.raw() est appliqué SEULEMENT à cette route.
app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(
        "❌ Erreur de vérification de la signature webhook:",
        err.message
      );
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gérer l'événement
    if (event.type === "checkout.session.completed") {
      const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
        event.data.object.id,
        {
          expand: ["line_items.data.price.product"], // Expand pour avoir metadata
        }
      );
      console.log(
        "✅ Webhook: checkout.session.completed reçu pour session:",
        sessionWithLineItems.id
      );

      const customerEmail = sessionWithLineItems.customer_details?.email;

      // --- Gestion de plusieurs articles ---
      const purchasedItems = sessionWithLineItems.line_items?.data
        .map((item) => ({
          name: item.price?.product?.name || "Affiche personnalisée",
          cartItemId: item.price?.product?.metadata?.cartItemId,
        }))
        .filter((item) => item.cartItemId); // Filtrer au cas où un item n'aurait pas de cartItemId

      if (!customerEmail) {
        console.error(
          "❌ Erreur Webhook: Email client manquant dans la session",
          sessionWithLineItems.id
        );
      } else if (!purchasedItems || purchasedItems.length === 0) {
        console.error(
          "❌ Erreur Webhook: Aucun article avec cartItemId trouvé dans les métadonnées pour session",
          sessionWithLineItems.id
        );
      } else if (!sendgridApiKey) {
        console.warn(
          "⚠️ Webhook: SENDGRID_API_KEY non configurée. Email de confirmation non envoyé pour",
          customerEmail
        );
      } else {
        const backendBaseUrl =
          process.env.BACKEND_URL || `http://localhost:3001`;

        // --- Récupération des détails de la commande pour l'email ---
        const orderTotal = sessionWithLineItems.amount_total;
        const orderCurrency = sessionWithLineItems.currency.toUpperCase();
        const orderDate = new Date().toLocaleDateString("fr-FR", {
          // Formatage date FR
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const orderReference = sessionWithLineItems.id; // ID de session Stripe comme référence

        // Formatage du prix (pour affichage)
        /* const formattedTotal = (orderTotal / 100).toLocaleString('fr-FR', {
            style: 'currency',
            currency: orderCurrency
        }); */
        // Nouveau formatage sans espace avant le symbole
        const formattedNumber = (orderTotal / 100).toLocaleString("fr-FR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const currencySymbol = orderCurrency === "EUR" ? "€" : orderCurrency; // Gérer EUR spécifiquement
        const formattedTotal = `${formattedNumber}${currencySymbol}`;

        // --- Génération de l'HTML pour l'email (Enrichi) ---
        let itemsHtml = await Promise.all(
          purchasedItems.map(async (item) => {
            const downloadUrl = `${backendBaseUrl}/api/download-pdf/${item.cartItemId}`;
            const previewPath = path.join(
              __dirname,
              "pdfs",
              "previews",
              `poster-${item.cartItemId}.pdf.png`
            );
            let previewImgTag = "";
            if (fsSync.existsSync(previewPath)) {
              const previewUrl = `${backendBaseUrl}/previews/poster-${item.cartItemId}.pdf.png`;
              previewImgTag = `<img src="${previewUrl}" alt="Preview" style="max-width:200px; border-radius:8px; margin-top:12px;" />`;
            }
            return `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eaeaea;">
                  <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.5;">${item.name}</p>
                  ${previewImgTag}
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eaeaea; text-align: right;">
                  <a href="${downloadUrl}" target="_blank" style="background-color: #2a2a2a; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; display: inline-block; letter-spacing: 0.5px;">Télécharger</a>
                </td>
              </tr>
            `;
          })
        );
        itemsHtml = itemsHtml.join("");

        const emailHtml = `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Votre commande RunMemories</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; background-color: #f8f8f8; }
              .email-container { width: 100%; max-width: 640px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
              .email-header { background-color: #2a2a2a; padding: 25px; text-align: center; }
              .email-header img { max-width: 180px; height: auto; }
              .email-body { padding: 30px 40px; color: #444444; font-size: 16px; line-height: 1.7; }
              .email-body h1 { font-size: 22px; color: #2a2a2a; margin-top: 0; margin-bottom: 20px; font-weight: 600; }
              .email-body p { margin: 10px 0; }
              .items-table { width: 100%; border-collapse: collapse; margin: 25px 0; }
              .items-table th { text-align: left; padding-bottom: 12px; border-bottom: 2px solid #eaeaea; font-size: 14px; color: #555555; text-transform: uppercase; letter-spacing: 0.5px; }
              .order-summary { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; }
              .summary-line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
              .summary-label { color: #666666; }
              .summary-value { color: #333333; font-weight: 500; }
              .total-line { font-size: 16px; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 2px solid #cccccc; }
              .email-footer { background-color: #f1f1f1; padding: 25px 40px; text-align: center; font-size: 13px; color: #888888; line-height: 1.5; }
              .email-footer a { color: #555555; text-decoration: none; font-weight: 500; }
              .button-link { background-color: #2a2a2a; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; display: inline-block; letter-spacing: 0.5px; }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <img src="logo" alt="Runmemories Logo">
              </div>
              <div class="email-body">
                <h1>Merci pour votre commande!</h1>
                <p>Bonjour,</p>
                <p>Votre paiement a été confirmé et vos affiches personnalisées sont prêtes à être téléchargées.</p>
                <div class="order-summary">
                  <div class="summary-line">
                    <span class="summary-label">Date de commande:&nbsp;</span>
                    <span class="summary-value">${orderDate}</span>
                  </div>
                  <div class="summary-line">
                    <span class="summary-label">Référence:&nbsp;</span>
                    <span class="summary-value" style="font-size: 12px; word-break: break-all;">${orderReference}</span>
                  </div>
                  <div class="summary-line total-line">
                    <span class="summary-label">Total payé:&nbsp;</span>
                    <span class="summary-value">${formattedTotal}</span>
                  </div>
                </div>

                <p style="margin-top: 30px;">Retrouvez vos articles ci-dessous: </p>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th style="text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
                <p style="margin-top: 30px;">Si vous avez la moindre question, n'hésitez pas à nous contacter.</p>
                <p>Cordialement,</p>
                <p><strong>L'équipe Runmemories</strong></p>
              </div>
              <div class="email-footer">
                <p>&copy; ${new Date().getFullYear()} Runmemories. Tous droits réservés.</p>
                <p><a href="http://localhost:5173">Visitez notre site</a> | <a href="http://localhost:5173">Nous contacter</a></p>
              </div>
            </div>
          </body>
          </html>
        `;

        console.log(
          `Préparation de l'email/reçu pour ${customerEmail} avec ${purchasedItems.length} article(s). Total: ${formattedTotal}`
        );

        // Préparer l'email sans pièce jointe PDF (juste le lien)
        const msg = {
          to: customerEmail,
          from: "moiseball20155@gmail.com", // Adresse vérifiée
          subject: `Votre commande Runmemories #${orderReference.substring(
            3,
            10
          )}`,
          html: emailHtml,
        };

        try {
          await sgMail.send(msg);
          console.log(
            `✅ Email de confirmation envoyé avec succès à ${customerEmail} pour la session ${sessionWithLineItems.id}`
          );
        } catch (error) {
          console.error(
            `❌ Erreur lors de l'envoi de l'email via SendGrid pour ${customerEmail} (Session: ${sessionWithLineItems.id}):`,
            error
          );
        }
      }
    } else {
      console.log(`Webhook non géré reçu: ${event.type}`);
    }

    // Renvoyer une réponse 200 à Stripe
    res.status(200).json({ received: true });
  }
);

// 2. Parsers JSON et URL-encoded (APRES le webhook)
// Ces middlewares s'appliqueront aux routes définies CI-DESSOUS.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 3. Autres Routes (qui nécessitent le corps parsé)

// Ajouts pour preview PDF
const previewsDir = path.join(__dirname, "pdfs", "previews");
fs.mkdir(previewsDir, { recursive: true }).catch(console.error);
app.use("/previews", express.static(previewsDir));

// Fonction utilitaire pour générer un PNG preview (première page) d'un PDF buffer
async function generatePdfPreview(pdfBuffer, previewPath) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();
  // Canvas : taille réduite (ex : 300px de large max)
  const scale = Math.min(1, 300 / width);
  const canvas = createCanvas(width * scale, height * scale);
  const ctx = canvas.getContext("2d");
  // pdf-lib ne sait pas dessiner la page, donc on va juste afficher une page blanche + texte
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#333";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("Preview PDF", 20, 40);
  // Pour une vraie preview, il faudrait une lib de rendu PDF côté Node (hors poppler). Ici, on fait un placeholder.
  const buffer = canvas.toBuffer("image/png");
  await fs.writeFile(previewPath, buffer);
}

// --- Route d'Upload PDF ---
app.post(
  "/api/upload-poster-pdf",
  upload.single("pdf"),
  async (req, res, next) => {
    // req.file.buffer contient le fichier en mémoire
    // req.body contient les autres champs (cartItemId)
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier PDF reçu." });
    }
    // Vérification taille minimale (10ko)
    if (req.file.size < 10 * 1024) {
      return res
        .status(400)
        .json({
          error:
            "Le fichier PDF généré est trop petit (corrompu ou vide). Veuillez réessayer.",
        });
    }
    const cartItemId = req.body.cartItemId;
    if (!cartItemId) {
      return res.status(400).json({ error: "cartItemId manquant." });
    }
    // Valider le format de cartItemId
    if (!/^cart-\d+-[a-f0-9]+$/.test(cartItemId)) {
      return res.status(400).json({ error: "Format de cartItemId invalide." });
    }

    // Construire le chemin de sauvegarde
    const savePath = path.join(pdfsDir, `${cartItemId}.pdf`);

    try {
      // Sauvegarder le buffer en fichier
      await fs.writeFile(savePath, req.file.buffer);
      console.log(
        `✅ Fichier PDF reçu et sauvegardé pour cartItemId: ${cartItemId} à ${savePath}`
      );
      // Générer le preview
      const previewPath = path.join(previewsDir, `${cartItemId}.png`);
      await generatePdfPreview(req.file.buffer, previewPath);
      res.status(200).json({
        message: "PDF uploadé avec succès.",
        filename: `${cartItemId}.pdf`,
      });
    } catch (saveError) {
      console.error(
        `Erreur lors de la sauvegarde du fichier PDF pour ${cartItemId}:`,
        saveError
      );
      res
        .status(500)
        .json({ error: "Erreur serveur lors de la sauvegarde du fichier." });
    }
  },
  (error, req, res, next) => {
    // Gestionnaire d'erreurs spécifique pour multer
    if (error instanceof multer.MulterError) {
      console.error("Erreur Multer lors de l'upload:", error);
      return res
        .status(400)
        .json({ error: `Erreur d'upload: ${error.message}` });
    } else if (error) {
      console.error("Erreur inconnue lors de l'upload:", error);
      return res
        .status(500)
        .json({ error: error.message || "Erreur serveur lors de l'upload." });
    }
    next();
  }
);

// Nouvelle route d'upload PDF + preview image base64
app.post(
  "/api/upload-pdf-with-preview",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "previewImage", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const file = req.files["file"]?.[0];
      const preview = req.files["previewImage"]?.[0];
      if (!file) return res.status(400).json({ error: "Aucun fichier PDF envoyé." });
      if (!preview) return res.status(400).json({ error: "Aucun preview image envoyé." });

      // Sauvegarder le PDF
      const pdfPath = path.join(pdfsDir, file.originalname);
      await fs.writeFile(pdfPath, file.buffer);

      // Optimiser et sauvegarder l'image preview
      const previewPath = path.join(previewsDir, file.originalname + ".png");
      const compressedBuffer = await sharp(preview.buffer)
        .resize({ width: 400 }) // Redimensionne à 400px de large max
        .jpeg({ quality: 70 })  // Convertit en JPEG compressé (qualité 70%)
        .toBuffer();
      await fs.writeFile(previewPath, compressedBuffer);

      const previewUrl = `/previews/${file.originalname}.png`;
      res.json({ success: true, pdfUrl: `/pdfs/${file.originalname}`, previewUrl });
    } catch (e) {
      res.status(500).json({ error: "Erreur upload ou preview." });
    }
  }
);

// --- Route principale ---
app.get("/", (req, res) => {
  res.send("Backend RunMemories API is running!");
});

// --- Route Create Checkout Session ---
app.post("/api/create-checkout-session", async (req, res) => {
  console.log("Requête reçue sur /api/create-checkout-session");
  const { line_items } = req.body;

  // Validation minimale (vérifier que c'est un tableau)
  if (!Array.isArray(line_items)) {
    console.error("Erreur: line_items n'est pas un tableau", line_items);
    return res.status(400).json({ error: { message: "Invalid data format." } });
  }

  // Assurer que chaque item a au moins les champs requis par Stripe
  // et le cartItemId dans metadata
  const isValidItems = line_items.every(
    (item) =>
      item.price_data?.currency &&
      typeof item.price_data?.unit_amount === "number" &&
      item.price_data?.product_data?.name &&
      item.price_data?.product_data?.metadata?.cartItemId &&
      typeof item.quantity === "number" &&
      item.quantity > 0
  );

  if (!isValidItems) {
    console.error(
      "Erreur: Structure de line_items invalide ou cartItemId/quantity manquant",
      line_items
    );
    return res.status(400).json({
      error: {
        message:
          "Invalid structure or missing cartItemId/quantity in line items.",
      },
    });
  }

  // Utiliser directement les line_items fournis par le frontend
  const formattedLineItems = line_items;

  const successUrl = `${frontendUrl}/commande/succes?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${frontendUrl}/checkout`; // Ou /cart ?

  try {
    // Log pour vérifier l'URL du frontend avant création de session
    console.log(
      `Vérification avant création session: frontendUrl = '${frontendUrl}'`
    );
    console.log(`URL de succès construite: ${successUrl}`);

    console.log("Création de la session Stripe Checkout...");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: formattedLineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      // customer_email: 'required', // <-- RETIRÉ: Laisser Stripe gérer la collecte
      // Note : Stripe peut limiter la taille/complexité des métadonnées
    });

    console.log("Session Stripe créée avec succès:", session.id);
    res.json({ url: session.url });
  } catch (error) {
    console.error("Erreur lors de la création de la session Stripe:", error);
    res.status(500).json({
      error: {
        message: error.message || "Failed to create checkout session.",
      },
    });
  }
});

// --- Route Download PDF ---
app.get("/api/download-pdf/:cartItemId", async (req, res) => {
  try {
    const { cartItemId } = req.params;
    // Valider le format de cartItemId (sécurité basique)
    if (!/^cart-\d+-[a-f0-9]+$/.test(cartItemId)) {
      console.warn(
        `Tentative de téléchargement avec cartItemId invalide: ${cartItemId}`
      );
      return res.status(400).json({ error: "Format d'identifiant invalide." });
    }

    const pdfPath = path.join(pdfsDir, `poster-${cartItemId}.pdf`);
    console.log(`Tentative de téléchargement du PDF: ${pdfPath}`);

    // Vérifier si le fichier existe
    await fs.access(pdfPath);
    console.log(`Fichier trouvé: ${pdfPath}`);

    // Envoyer le fichier
    res.download(
      pdfPath,
      `runmemories-${cartItemId.substring(5, 13)}.pdf`,
      (err) => {
        // Nom plus court
        if (err) {
          // Gérer les erreurs qui peuvent survenir APRES le début de l'envoi
          if (!res.headersSent) {
            console.error(
              `Erreur non gérée lors de l'envoi du fichier ${pdfPath}:`,
              err
            );
            // Si les en-têtes n'ont pas été envoyés, on peut envoyer une réponse d'erreur
            try {
              res
                .status(500)
                .json({ error: "Erreur lors de l'envoi du fichier." });
            } catch (e) {}
          } else {
            console.error(
              `Erreur après envoi des en-têtes pour ${pdfPath}:`,
              err
            );
          }
        } else {
          console.log(`PDF ${pdfPath} envoyé avec succès.`);
        }
      }
    );
  } catch (error) {
    const cartItemId = req.params.cartItemId;
    if (error.code === "ENOENT") {
      console.warn(
        `PDF non trouvé pour téléchargement (${cartItemId}): Fichier inexistant.`
      );
      res.status(404).json({ error: "Fichier PDF non trouvé." });
    } else {
      console.error(
        `Erreur lors de la tentative de téléchargement du PDF (${cartItemId}):`,
        error
      );
      res
        .status(500)
        .json({ error: "Erreur serveur lors du téléchargement du PDF." });
    }
  }
});

// --- Route Verify Payment ---
app.get("/api/verify-payment/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`Vérification paiement pour session: ${sessionId}`);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"], // Expand pour avoir metadata dans product
    });

    if (session.payment_status === "paid") {
      console.log(`Paiement vérifié pour session ${sessionId}`);
      res.json({ isPaid: true, session });
    } else {
      console.log(
        `Paiement NON confirmé pour session ${sessionId}: ${session.payment_status}`
      );
      res.status(402).json({
        isPaid: false,
        error: "Paiement non complété ou en attente.",
        payment_status: session.payment_status,
      });
    }
  } catch (error) {
    console.error(
      `Erreur lors de la vérification du paiement pour ${req.params.sessionId}:`,
      error
    );
    res.status(500).json({
      isPaid: false,
      error: "Erreur lors de la vérification du paiement.",
    });
  }
});

// --- Route d'Upload PDF ---
app.post("/api/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Aucun fichier envoyé." });
    const pdfPath = path.join(pdfsDir, file.originalname);
    await fs.writeFile(pdfPath, file.buffer);
    // Générer le preview
    const previewPath = path.join(previewsDir, file.originalname + ".png");
    await generatePdfPreview(file.buffer, previewPath);
    const previewUrl = `/previews/${file.originalname}.png`;
    res.json({ success: true, pdfUrl: `/pdfs/${file.originalname}`, previewUrl });
  } catch (e) {
    res.status(500).json({ error: "Erreur upload ou preview." });
  }
});

// --- Démarrer le serveur ---
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Backend server listening at http://0.0.0.0:${port}`);
});
