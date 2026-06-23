import "./index.css";
import { Composition } from "remotion";
import { sampleVideoData } from "./sample-data";
import { SocialMetricsVideo } from "./SocialMetricsVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SocialMetrics"
        component={SocialMetricsVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={sampleVideoData}
      />
    </>
  );
};
