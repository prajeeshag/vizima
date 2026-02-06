import { type CreateLayerRenderer, type LayerRenderer } from "./layer-renderer";
import {
  createGraticulePainter,
  type GraticuleProp,
  GraticulePainter,
} from "../components/painters";

type GraticuleRendererProps = GraticuleProp;

type CreateGraticuleRenderer = CreateLayerRenderer<GraticuleRendererProps>;

export type GraticuleRenderer = LayerRenderer<GraticuleRendererProps>;

export const createGraticuleRenderer: CreateGraticuleRenderer = () => {
  const graticuleRenderer: GraticuleRenderer = async (
    props: GraticuleRendererProps,
  ): Promise<GraticulePainter> => {
    return createGraticulePainter({ ...props });
  };
  return graticuleRenderer;
};
