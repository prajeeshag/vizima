import { type StaticRenderer } from "./static-renderer";
import {
  createGraticulePainter,
  type GraticuleProp,
  GraticulePainter,
} from "../../components/painters";

export type GraticuleRendererProps = GraticuleProp;

export const createGraticuleRenderer = (kwrgs: {
  getProps: () => GraticuleRendererProps;
}) => {
  const getProps = kwrgs.getProps;
  const graticuleRenderer: StaticRenderer =
    async (): Promise<GraticulePainter> => {
      const props = getProps();
      return createGraticulePainter(props);
    };
  return graticuleRenderer;
};
