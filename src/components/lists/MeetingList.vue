<template>
  <div class="flex flex-col">
    <div ref="commentScroll">
      <div class="overflow-y-auto max-h-[380px] px-8" @scroll="handleScroll">
        <MeetingItem
          v-for="(meeting, index) in meetings"
          :key="index"
          :meeting="meeting"
        />
      </div>
    </div>
  </div>
</template>
<script>
import MeetingItem from "../items/MeetingItem.vue";
import { onMounted, onUnmounted, reactive, ref } from "vue";
import { useAuthStore, useMeetingStore } from "../../stores";
import TheBody1 from "../typography/TheBody1.vue";

export default {
  components: { MeetingItem, TheBody1 },
  props: {
    meetings: {
      type: [Array, Object],
      required: true
    },
    ab: {
      type: Array,
      required: false,
      default: []
    }
  },
  setup(props) {
    const meetingStore = useMeetingStore();
    const authStore = useAuthStore();
    const commentScroll = ref(null);
    const bottom = ref(false);

    let state = reactive({
      trendingRepos: [],
      page: 1,
      noResult: false,
      message: "",
      user: {},
      commentsBeenFetched: false
    });

    onMounted(async () => {
      state.user = await authStore.getUser();
      assignForLoading();
      commentScroll.value.addEventListener("scroll", handleScroll);
    });

    onUnmounted(() => {
      if (commentScroll.value) {
        commentScroll.value.removeEventListener("scroll", handleScroll);
      }
    });

    const handleScroll = (e) => {
      const clientHeight = e.target.clientHeight;
      const scrollHeight = e.target.scrollHeight;
      const scrollTop = e.target.scrollTop;
      if (scrollTop + clientHeight >= scrollHeight) {
        bottom.value = true;
      } else {
        bottom.value = false;
      }
      if (bottom.value && !state.commentsBeenFetched) {
        assignForLoading();
      }
    };

    function assignForLoading() {
      try {
        if (Object.keys(props.meetings).length != state.trendingRepos.length) {
          state.trendingRepos = [];
          if (Object.keys(props.meetings).length > 0) {
            state.commentsBeenFetched = true;
            for (const meeting in props.meetings) {
              state.trendingRepos.push(props.meetings[meeting]);
            }
            meetingStore.unsubscribeMeetings();
            meetingStore.subscribeMeetings(state.user.uid);
            state.page++;
          } else {
            state.noResult = true;
            state.message = "No result found";
          }
          state.commentsBeenFetched = false;
        }
      } catch (err) {
        state.noResult = true;
        state.message = "Error loading data";
      }
    }

    return {
      assignForLoading,
      state,
      handleScroll,
      commentScroll
    };
  }
};
</script>
