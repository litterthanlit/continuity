import { scene, Stage, Center, Headline } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="solid">
      <Center>
        <Headline ct="word" size="h1">{text.word}</Headline>
      </Center>
    </Stage>
  ),
});
