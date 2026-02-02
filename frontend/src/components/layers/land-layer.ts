import { type Layer } from "./layer";
import { createJsonDataAgent, JsonDataAgent } from "../json-data";
import { createLandPainter, LandPainter, type LandProps } from "../painters";

export type LandLayerProps = Omit<LandProps, "landJson"> & {
  landJsonUrl: string;
};

export class LandLayer implements Layer {
  private jsonDataAgent: JsonDataAgent;

  constructor() {
    this.jsonDataAgent = createJsonDataAgent();
  }

  async getPainter(props: LandLayerProps): Promise<LandPainter> {
    const landJson = await this.jsonDataAgent.get({ url: props.landJsonUrl });
    return createLandPainter({ ...props, landJson });
  }
}
