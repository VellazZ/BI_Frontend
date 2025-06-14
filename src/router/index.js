import { createRouter, createWebHistory } from 'vue-router';
import NewsLifecycle from '@/components/NewsLifecycle.vue';
import CategoryStats from '@/components/CategoryStats.vue';
import UserInterests from '@/components/UserInterests.vue';
import NewsStats from '@/components/NewsStats.vue';
import NewsAnalysis from '@/components/NewsAnalysis.vue';
import NewsRecommendation from '@/components/NewsRecommendation.vue';

const routes = [
  { path: '/' },
  { path: '/news-lifecycle', component: NewsLifecycle, name: 'News Lifecycle' },
  { path: '/category-trends', component: CategoryStats, name: 'Category Trends' },
  { path: '/user-interests', component: UserInterests, name: 'User Interests' },
  { path: '/flexible-query', component: NewsStats, name: 'Flexible Query' },
  { path: '/viral-analysis', component: NewsAnalysis, name: 'Viral Analysis' },
  { path: '/recommendations', component: NewsRecommendation, name: 'Recommendations' },
  { path: '/query-logs', component: { template: '<div>Query Logs (TBD)</div>' }, name: 'Query Logs' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;