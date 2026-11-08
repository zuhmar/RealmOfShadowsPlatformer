import { ClassSprite } from './ClassSprite';
export function Avatar({
  appearance = 'male',
  outfit = 'sage',
}: {
  appearance?: string;
  outfit?: string;
}) {
  return <ClassSprite skin="golden-test" appearance={appearance} outfit={outfit} />;
}
