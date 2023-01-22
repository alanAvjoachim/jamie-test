import { createRouter, createWebHashHistory } from "vue-router";
import { useAuthStore } from "../stores";

const router = createRouter({
  // eslint-disable-next-line no-undef
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "Sign Up",
      component: () => import("../views/signup/SignUp.vue"),
      meta: {
        isOnboarding: true
      }
    },
    {
      path: "/sign-up-step-1",
      name: "Sign Up Step 1",
      component: () => import("../views/signup/SignUpStepOne.vue"),
      meta: {
        isOnboarding: true
      }
    },
    {
      path: "/sign-up-step-2",
      name: "Sign Up Step 2",
      component: () => import("../views/signup/SignUpStepTwo.vue"),
      meta: {
        isOnboarding: true
      }
    },
    {
      path: "/sign-in",
      name: "Sign In",
      component: () => import("../views/signin/SignIn.vue"),
      meta: {
        isOnboarding: true
      }
    },
    {
      path: "/sign-in-step-1",
      name: "Sign In Step 1",
      component: () => import("../views/signin/SignInStepOne.vue"),
      meta: {
        isOnboarding: true
      }
    },
    {
      path: "/home",
      name: "Home",
      component: () => import("../views/home/HomeView.vue"),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/meeting-details/:id",
      name: "Meeting Details",
      component: () => import("../views/home/DetailsView.vue"),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/speaker-identification/:id",
      name: "Speaker Identification",
      component: () => import("../views/home/SpeakerIdentification.vue"),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/summarizing",
      name: "Summarizing",
      component: () => import("../views/home/SummarizingView.vue"),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/enter-name",
      name: "Enter Name",
      component: () => import("../views/home/EnterName.vue"),
      meta: {
        requiresAuth: true,
        isOnboarding: true
      }
    },
    {
      path: "/select-subscription",
      name: "Select Subscription",
      component: () => import("../views/home/SelectSubscription.vue"),
      meta: {
        requiresAuth: true,
        isOnboarding: true
      }
    },
    {
      path: "/select-subscription-step-2",
      name: "Select Subscription Step 2",
      component: () => import("../views/home/SelectSubscriptionStepTwo.vue"),
      meta: {
        requiresAuth: true,
        isOnboarding: true
      }
    },
    {
      path: "/select-subscription-step-3",
      name: "Select Subscription Step 3",
      component: () => import("../views/home/SelectSubscriptionStepThree.vue"),
      meta: {
        requiresAuth: true,
        isOnboarding: true
      }
    },
    {
      path: "/free-trial",
      name: "Free Trial",
      component: () => import("../views/home/FreeTrial.vue"),
      meta: {
        requiresAuth: true,
        isOnboarding: true
      }
    },
    {
      path: "/allow-microphone-access",
      name: "Allow Microphone Access",
      component: () => import("../views/home/AllowMicrophoneAccess.vue"),
      meta: {
        requiresAuth: true,
        isOnboarding: true
      }
    },
    {
      path: "/connect-google-calendar",
      name: "Connect Google Calendar",
      component: () => import("../views/home/ConnectGoogleCalendar.vue"),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/new-version-available",
      name: "New Version Available",
      component: () => import("../views/home/NewVersionAvailable.vue"),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/settings",
      name: "Settings",
      component: () => import("../views/settings/SettingsView.vue"),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/select-plan",
      name: "Select Plan",
      component: () => import("../views/settings/SelectPlan.vue"),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/select-plan-step-2",
      name: "Select Plan Step 2",
      component: () => import("../views/settings/SelectPlanStepTwo.vue"),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: "/select-plan-step-3",
      name: "Select Plan Step 3",
      component: () => import("../views/settings/SelectPlanStepThree.vue"),
      meta: {
        requiresAuth: true
      }
    }
  ]
});

router.beforeEach(async (to, from, next) => {
  document.title = "jamie";

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isOnboarding = to.matched.some((record) => record.meta.isOnboarding);
  const authStore = useAuthStore();
  const user = await authStore.getUser();
  let userDetails = user == null ? null : await authStore.getUserDetails();
  if (requiresAuth && user == null) next("sign-in");
  else if (requiresAuth && user != null) {
    if (isOnboarding) next();
    else {
      if (userDetails.onboardingComplete) next();
      else next("sign-up-step-2");
    }
  }
  // else if(!requiresAuth && user) next("home");
  else if (!requiresAuth && user != null) next();
  else next();
});

export default router;
