import { type LayerRenderer } from "./layer-renderer";
import { createJsonDataAgent } from "../json-data";
import { createLandPainter, LandPainter, type LandProps } from "../painters";

type LandRendererProps = Omit<LandProps, "landJson"> & {
  landJsonUrl: string;
};

export const createLandRenderer: LayerRenderer<LandRendererProps> = () => {
  const jsonDataAgent = createJsonDataAgent();
  return async (props: LandRendererProps): Promise<LandPainter> => {
    const landJson = await jsonDataAgent.get({ url: props.landJsonUrl });
    return createLandPainter({ ...props, landJson });
  };
};
