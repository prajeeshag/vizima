import { type CreateLayerRenderer, type LayerRenderer } from "./layer-renderer";
import { createJsonDataAgent } from "../components/json-data";
import {
  createLandPainter,
  LandPainter,
  type LandProps,
} from "../components/painters";

type LandRendererProps = Omit<LandProps, "landJson"> & {
  landJsonUrl: string;
};

type CreateLandRenderer = CreateLayerRenderer<LandRendererProps>;

export type LandRenderer = LayerRenderer<LandRendererProps>;

export const createLandRenderer: CreateLandRenderer = () => {
  const jsonDataAgent = createJsonDataAgent();

  const landRenderer: LandRenderer = async (
    props: LandRendererProps,
  ): Promise<LandPainter> => {
    const landJson = await jsonDataAgent.get({ url: props.landJsonUrl });
    return createLandPainter({ ...props, landJson });
  };

  return landRenderer;
};
