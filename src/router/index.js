import Vue from 'vue'
import VueRouter from 'vue-router'
import Login from '../view/Login'
import Register from '../view/Register'
import Home from '../view/Home'
// 安装路由
Vue.use(VueRouter);

// 配置路由
const router = new VueRouter({
  routes: [{
    path: "/",
    redirect: "/login"
  },
  {
    name: "Login",
    path: '/login',
    component: Login
  },
  {
    name: "Register",
    path: '/register',
    component: Register
  },
  {
    name: "Home",
    path: '/home',
    component: Home,
    children: [
      {
        name: "Chat",
        path: "/home/chat",
        component: () => import("../view/Chat"),
      },
      {
        name: "Friend",
        path: "/home/friend",
        component: () => import("../view/Friend"),
      },
      {
        name: "FriendApply",
        path: "/home/friend-apply",
        component: () => import("../view/FriendApply"),
      },
      {
        name: "BlackList",
        path: "/home/blacklist",
        component: () => import("../view/BlackList"),
      },
      {
        name: "GROUP",
        path: "/home/group",
        component: () => import("../view/Group"),
      }
    ]
  }
  ]
});

// 白名单路由（不需要登录）
const whiteList = ['/login', '/register'];

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = sessionStorage.getItem('token');
  const userID = sessionStorage.getItem('userID');

  console.log('[Router] 路由跳转:', from.path, '->', to.path, 'token:', token ? '有' : '无', 'userID:', userID);

  if (whiteList.includes(to.path)) {
    // 白名单路由直接放行
    next();
  } else if (token && userID) {
    // 有 token 和 userID，放行
    next();
  } else {
    // 没有登录信息，跳转登录页
    console.warn('[Router] 未登录，跳转登录页');
    next('/login');
  }
});

export default router;
