import ViewInit from '@/shared/services/ViewInit';

const vue_bubble = () => import(/* webpackChunkName: "bubble" */ '@/views/other/bubble.vue');

export default {
  path: '/bubble/:iconName/:color?/:number?',
  component: vue_bubble,
  beforeEnter(to, from, next) {
    ViewInit().then(next);
  },
  meta: {
    title: '0.0',
    leftMenuViewButtons: [],
  },
};
