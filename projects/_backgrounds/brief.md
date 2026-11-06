# Backgrounds gallery (reference)

Backdrops are one flat colour or a bold moving field, never a faint wash (docs/decisions/0011).
This gallery shows the field:

1. **a → b** — two scenes on `bg="gradient" gradient="aurora"`, joined by a plain cut. The field
   is a function of global time with one seed per preset, so it flows straight through the cut.

Judge with `npx ct stills _backgrounds --at 1,1.99,2.0`. This is a reference reel, not a film.
