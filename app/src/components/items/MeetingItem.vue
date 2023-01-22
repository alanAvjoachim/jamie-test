<template>
  <div
    class="px-4 py-3 bg-accent rounded-md mb-4 cursor-pointer"
    @click.stop.prevent="goToDetails"
  >
    <div class="flex justify-between items-center">
      <TheBody1 class="text-white">{{ meeting.title }}</TheBody1>
      <div
        class="flex justify-center items-center text-secondary"
        v-if="
          meeting.status != 'complete' &&
          meeting.status != 'identificationOfSpeakersNeeded'
        "
      >
        <img class="w-3 mr-2" src="/edit.png" />
        <TheLabel class="text-xs">jamie is writing the summary...</TheLabel>
      </div>
    </div>

    <TheLabel class="text-secondary mt-1">
      {{ humanizeToDateFromUnix(meeting.createAt) }} at
      {{ unixToTime(meeting.from) }} -
      {{ unixToTime(meeting.to) }}
    </TheLabel>
  </div>
</template>
<script>
import moment from "moment";
import TheBody1 from "../typography/TheBody1.vue";
import TheLabel from "../typography/TheLabel.vue";
import { useRouter } from "vue-router";

export default {
  components: { TheBody1, TheLabel },
  props: {
    meeting: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const router = useRouter();

    function humanizeToDateFromUnix(timestamp) {
      const date = moment(timestamp);

      if (date.isSame(new Date(), "day")) {
        return "Today";
      } else if (date.isSame(new Date(), "week")) {
        return date.format("dddd");
      } else if (date.isSame(new Date(), "year")) {
        return date.format("MMMM Do");
      } else {
        return date.format("MMMM Do YYYY");
      }
    }

    function unixToTime(timestamp) {
      return moment(timestamp).format("HH:mm");
    }

    function goToDetails() {
      if (props.meeting.status === "identificationOfSpeakersNeeded") {
        router.push(`speaker-identification/${props.meeting.id}`);
      } else if (props.meeting.status === "complete") {
        router.push(`meeting-details/${props.meeting.id}`);
      }
    }

    return {
      humanizeToDateFromUnix,
      unixToTime,
      goToDetails
    };
  }
};
</script>
