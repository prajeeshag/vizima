import { type StaticRenderer } from "./static-renderer";
import { createJsonDataAgent } from "../components/json-data";
import {
  createLandPainter,
  LandPainter,
  type LandProps,
} from "../components/painters";
import { type Expand } from "../type-helpers";

export type LandRendererProps = Expand<
  Omit<LandProps, "landJson"> & {
    landJsonUrl: string;
  }
>;

export const createLandRenderer = (kwrgs: {
  getProps: () => LandRendererProps;
}) => {
  const jsonDataAgent = createJsonDataAgent();
  const getProps = kwrgs.getProps;

  const landRenderer: StaticRenderer = async (): Promise<LandPainter> => {
    const props = getProps();
    const landJson = await jsonDataAgent.get({ url: props.landJsonUrl });
    return createLandPainter({ ...props, landJson });
  };
  return landRenderer;
};
