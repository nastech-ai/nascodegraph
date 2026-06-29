import type { QueryBuilder } from '../db/queries';
import type { ResolutionContext } from './types';
/**
 * Synthesize dispatcher→callback edges (field observers + EventEmitters +
 * React re-render + JSX children + Vue templates + SvelteKit load + RN event
 * channel + Fabric native-impl + MyBatis Java↔XML + Gin middleware chain +
 * Redux-thunk dispatch chain + object-literal registry dispatch + RTK Query
 * generated-hook → endpoint + Pinia useStore().action() + Vuex string dispatch +
 * Celery task .delay()/.apply_async() → task body + Spring publishEvent → @EventListener +
 * MediatR Send/Publish → IRequestHandler/INotificationHandler +
 * Sidekiq Worker.perform_async → #perform + Laravel event(new X) → listener handle).
 * Returns the count added. Never throws into indexing — callers wrap in try/catch.
 */
export declare function synthesizeCallbackEdges(queries: QueryBuilder, ctx: ResolutionContext): number;
//# sourceMappingURL=callback-synthesizer.d.ts.map