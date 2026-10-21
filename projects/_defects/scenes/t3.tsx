import { scene, Stage, Center, Headline } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="lit">
      <Center>
        <Headline ct="word">{text.word}</Headline>
      </Center>
    </Stage>
  ),
  motion: (m) => {
    m.loop("bg", { scale: 0.02 }, { period: 8 }); // material-motion
    m.loop("word", { y: 6 }, { period: 4 }); // ambient-loop
    m.camera({ scale: [1, 1.1] }); // camera-drift
  },
});
