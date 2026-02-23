import React from 'react';
import {Composition} from 'remotion';
import {DemoVideo} from './DemoVideo';
import {TOTAL_FRAMES, VIDEO, SCENE_FRAMES} from './theme';

// Individual scenes for preview
import {IntroScene} from './scenes/IntroScene';
import {ProblemScene} from './scenes/ProblemScene';
import {DashboardScene} from './scenes/DashboardScene';
import {PlanningScene} from './scenes/PlanningScene';
import {PointageScene} from './scenes/PointageScene';
import {AnomaliesScene} from './scenes/AnomaliesScene';
import {RapportsScene} from './scenes/RapportsScene';
import {FeaturesScene} from './scenes/FeaturesScene';
import {TechStackScene} from './scenes/TechStackScene';
import {OutroScene} from './scenes/OutroScene';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ═══ FULL VIDEO ═══ */}
      <Composition
        id="DemoVideo"
        component={DemoVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />

      {/* ═══ INDIVIDUAL SCENES (for preview/dev) ═══ */}
      <Composition id="Intro" component={IntroScene} durationInFrames={SCENE_FRAMES.intro} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="Problem" component={ProblemScene} durationInFrames={SCENE_FRAMES.problem} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="Dashboard" component={DashboardScene} durationInFrames={SCENE_FRAMES.dashboard} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="Planning" component={PlanningScene} durationInFrames={SCENE_FRAMES.planning} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="Pointage" component={PointageScene} durationInFrames={SCENE_FRAMES.pointage} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="Anomalies" component={AnomaliesScene} durationInFrames={SCENE_FRAMES.anomalies} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="Rapports" component={RapportsScene} durationInFrames={SCENE_FRAMES.rapports} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="Features" component={FeaturesScene} durationInFrames={SCENE_FRAMES.features} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="TechStack" component={TechStackScene} durationInFrames={SCENE_FRAMES.techStack} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="Outro" component={OutroScene} durationInFrames={SCENE_FRAMES.outro} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    </>
  );
};
