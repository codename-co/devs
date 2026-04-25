/**
 * Shared scene components for tour video compositions.
 *
 * Each scene is a parametric `<Sprite>`-based component that can be
 * dropped into any video timeline. Videos supply their own translated
 * strings and timing; the scenes handle layout, animation, and responsiveness.
 */
export { SceneHook } from './SceneHook'
export { SceneCollapse } from './SceneCollapse'
export { ScenePromise, type PromisePhrase } from './ScenePromise'
export { SceneCTA } from './SceneCTA'
export { TourSphere, type TourSphereProps } from './TourSphere'
export { BackgroundOrbit } from './BackgroundOrbit'
