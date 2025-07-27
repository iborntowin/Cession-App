<script lang="ts">
  export let recentActivities;
  export let safeFormatDistanceToNow;
  import { slide } from 'svelte/transition';
</script>

<div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
  <h3 class="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
  <div class="space-y-4">
    {#each recentActivities as activity, i}
      <div class="flex items-center space-x-4" in:slide={{ duration: 300, delay: i * 100 }}>
        <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={activity.icon}/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-800">{activity.description}</p>
          <p class="text-xs text-gray-500">{safeFormatDistanceToNow(activity.time)} ago</p>
        </div>
      </div>
    {/each}
  </div>
</div>
