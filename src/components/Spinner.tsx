import { MoonLoader } from "react-spinners";

const Spinner = () => {
  return (
    <MoonLoader
      color={"#ffffff"}
      loading={true}
      size={20}
      aria-label="Loading Spinner"
      data-testid="loader"
      speedMultiplier={0.8}
    />
  );
};

export default Spinner;