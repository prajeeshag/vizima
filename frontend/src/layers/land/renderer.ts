import { type StaticRenderer } from "../../core/static-renderer";
import { JsonData } from "../../data/json-data";
import { createLandPainter, LandPainter, type LandProps } from "./painter";
import { type Expand } from "../../core/type-helpers";
import { mesh } from "topojson-client";

export type LandRendererProps = Expand<
  Omit<LandProps, "path"> & {
    topoJson: JsonData;
  }
>;

export const createLandRenderer = (kwrgs: {
  getProps: () => LandRendererProps;
}) => {
  const getProps = kwrgs.getProps;

  const landRenderer: StaticRenderer = async (): Promise<LandPainter> => {
    const props = getProps();
    const landJson = props.topoJson;
    const land = mesh(landJson.value);
    const path = new JsonData(landJson.props, land);
    return createLandPainter({ ...props, path });
  };
  return landRenderer;
};
