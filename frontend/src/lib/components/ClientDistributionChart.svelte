<script lang="ts">
  import Chart from 'chart.js/auto';
  import { onMount, onDestroy } from 'svelte';
  import { quintOut } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition';
  import { t } from '$lib/i18n';

  export let dangerClients = [];
  export let unstartedClients = [];
  export let workplaces = [];
  export let jobs = [];
  export let dataLoaded = false;
  export let onRefresh = () => {};
  export let selectedSeverity = 'all'; // New prop for filtering

  // Chart display mode
  let chartMode = 'severity'; // 'severity', 'workplace', 'job', 'activity'

  // Process data for charts
  $: filteredDangerClients = selectedSeverity === 'all' ? dangerClients : dangerClients.filter(client => client.severity === selectedSeverity);
  $: filteredUnstartedClients = unstartedClients; // Unstarted clients don't have severity, so keep all
  
  $: severityData = processSeverityData(filteredDangerClients);
  $: workplaceData = processWorkplaceData([...filteredDangerClients, ...filteredUnstartedClients], workplaces);
  $: jobData = processJobData([...filteredDangerClients, ...filteredUnstartedClients], jobs);
  $: activityData = processActivityData([...filteredDangerClients, ...filteredUnstartedClients]);

  function processSeverityData(clients) {
    const severityCounts = {
      critical: 0,
      danger: 0,
      warning: 0
    };

    clients.forEach(client => {
      const severity = client.severity?.toLowerCase();
      if (severityCounts.hasOwnProperty(severity)) {
        severityCounts[severity]++;
      }
    });

    return Object.entries(severityCounts).map(([severity, count]) => ({
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      count,
      percentage: clients.length > 0 ? (count / clients.length) * 100 : 0
    }));
  }

  function processWorkplaceData(clients, workplaces) {
    const workplaceMap = {};
    workplaces.forEach(w => {
      workplaceMap[w.id] = w.name;
    });

    const workplaceCounts = {};
    clients.forEach(client => {
      const workplaceName = workplaceMap[client.clientWorkplace] || client.clientWorkplace || 'Unknown';
      workplaceCounts[workplaceName] = (workplaceCounts[workplaceName] || 0) + 1;
    });

    return Object.entries(workplaceCounts)
      .map(([workplace, count]) => ({
        workplace,
        count,
        percentage: clients.length > 0 ? (count / clients.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 workplaces
  }

  function processJobData(clients, jobs) {
    // When a specific risk level is selected, show actual job titles for that risk level
    if (selectedSeverity !== 'all') {
      const jobCounts = {};
      
      clients.forEach(client => {
        // Only include clients that match the selected severity
        if (client.severity === selectedSeverity) {
          const jobName = client.clientJobName || 'Unknown Job';
          jobCounts[jobName] = (jobCounts[jobName] || 0) + 1;
        }
      });

      return Object.entries(jobCounts)
        .map(([job, count]) => ({
          job,
          count,
          percentage: clients.length > 0 ? (count / clients.length) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 job titles
    }

    // When showing all clients, show risk level breakdown
    const riskLevels = ['critical', 'danger', 'warning'];
    const jobData = [];

    riskLevels.forEach(riskLevel => {
      const clientsInRiskLevel = dangerClients.filter(client =>
        client.severity?.toLowerCase() === riskLevel
      );

      if (clientsInRiskLevel.length > 0) {
        jobData.push({
          job: `${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk Jobs`,
          count: clientsInRiskLevel.length,
          percentage: dangerClients.length > 0 ? (clientsInRiskLevel.length / dangerClients.length) * 100 : 0,
          riskLevel: riskLevel
        });
      }
    });

    // Add unstarted clients as a separate category
    const unstartedClients = clients.filter(client => !client.severity);
    if (unstartedClients.length > 0) {
      jobData.push({
        job: 'Unstarted Clients',
        count: unstartedClients.length,
        percentage: clients.length > 0 ? (unstartedClients.length / clients.length) * 100 : 0,
        riskLevel: 'unstarted'
      });
    }

    return jobData;
  }

  function processActivityData(clients) {
    const activityLevels = {
      'High Risk': 0,    // Critical severity
      'Medium Risk': 0,  // Danger severity
      'Low Risk': 0,     // Warning severity
      'Unstarted': 0     // Unstarted clients
    };

    // Count danger clients by severity
    dangerClients.forEach(client => {
      const severity = client.severity?.toLowerCase();
      if (severity === 'critical') {
        activityLevels['High Risk']++;
      } else if (severity === 'danger') {
        activityLevels['Medium Risk']++;
      } else if (severity === 'warning') {
        activityLevels['Low Risk']++;
      }
    });

    // Count unstarted clients
    activityLevels['Unstarted'] = unstartedClients.length;

    return Object.entries(activityLevels).map(([level, count]) => ({
      level,
      count,
      percentage: (dangerClients.length + unstartedClients.length) > 0 ?
        (count / (dangerClients.length + unstartedClients.length)) * 100 : 0
    }));
  }

  let canvas;
  let chart = null;

  function initChart() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (chart) {
      chart.destroy();
    }

    let data, labels, colors, title;

    switch (chartMode) {
      case 'severity':
        data = severityData.map(d => d.count);
        labels = severityData.map(d => d.severity);
        colors = ['#ef4444', '#f97316', '#eab308'];
        title = 'Client Risk Distribution by Severity';
        break;
      case 'workplace':
        data = workplaceData.map(d => d.count);
        labels = workplaceData.map(d => d.workplace);
        colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#84cc16'];
        title = 'Client Distribution by Workplace';
        break;
      case 'job':
        data = jobData.map(d => d.count);
        labels = jobData.map(d => d.job);
        if (selectedSeverity !== 'all') {
          // When filtered by risk level, show single item
          colors = ['#8b5cf6']; // Purple for filtered view
          title = `Job Titles for ${selectedSeverity.charAt(0).toUpperCase() + selectedSeverity.slice(1)} Risk Level`;
        } else {
          // When showing all, show multiple risk levels
          colors = ['#dc2626', '#ea580c', '#ca8a04', '#6b7280']; // Red, orange, yellow, gray for risk levels
          title = 'Client Distribution by Risk Level (Job Analysis)';
        }
        break;
      case 'activity':
        data = activityData.map(d => d.count);
        labels = activityData.map(d => d.level);
        colors = ['#ef4444', '#f97316', '#eab308', '#6b7280'];
        title = 'Client Activity & Risk Levels';
        break;
    }

    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: colors.map(color => color + 'dd'),
          borderWidth: 3,
          borderRadius: 8,
          hoverBorderWidth: 4,
          hoverBorderColor: colors.map(color => color + 'ff'),
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            align: 'center',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 13,
                weight: '700',
                family: "'Inter', 'SF Pro Display', system-ui, sans-serif"
              },
              color: '#1f2937',
              boxWidth: 12,
              boxHeight: 12,
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i];
                    const percentage = chartMode === 'severity' ? severityData[i]?.percentage :
                                     chartMode === 'workplace' ? workplaceData[i]?.percentage :
                                     chartMode === 'job' ? jobData[i]?.percentage :
                                     activityData[i]?.percentage;

                    return {
                      text: `${label}: ${value} (${percentage?.toFixed(1)}%)`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      strokeStyle: data.datasets[0].borderColor[i],
                      lineWidth: data.datasets[0].borderWidth,
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            enabled: true,
            padding: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            titleColor: '#111827',
            titleFont: { weight: '700', size: 15, family: "'Inter', system-ui, sans-serif" },
            bodyColor: '#4b5563',
            bodyFont: { size: 13, family: "'Inter', system-ui, sans-serif" },
            borderColor: 'rgba(0, 0, 0, 0.08)',
            borderWidth: 1,
            cornerRadius: 12,
            displayColors: true,
            boxWidth: 12,
            boxHeight: 12,
            boxPadding: 6,
            callbacks: {
              title: function(context) {
                return `📊 ${context[0].label}`;
              },
              label: function(context) {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                const riskLevel = chartMode === 'job' ? jobData[context.dataIndex]?.riskLevel : null;
                const riskText = riskLevel ? ` (${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)})` : '';
                return `Count: ${value}${riskText} (${percentage}%)`;
              }
            }
          },
          title: {
            display: true,
            text: title,
            font: {
              size: 16,
              weight: '700',
              family: "'Inter', system-ui, sans-serif"
            },
            color: '#111827',
            padding: { top: 10, bottom: 20 }
          }
        }
      }
    });
  }

  // Track previous values to prevent unnecessary updates
  let prevDataHash = '';
  let prevChartMode = chartMode;

  // Create a stable hash of the data to detect actual changes
  function hashData(data) {
    try {
      return JSON.stringify(data);
    } catch (e) {
      return '';
    }
  }

  // Only update chart when actual data changes, not on every reactive update
  $: if ((filteredDangerClients.length > 0 || filteredUnstartedClients.length > 0) && canvas) {
    const dataHash = hashData({ filteredDangerClients, filteredUnstartedClients, selectedSeverity });
    const modeChanged = chartMode !== prevChartMode;

    if (dataHash !== prevDataHash || modeChanged || !chart) {
      prevDataHash = dataHash;
      prevChartMode = chartMode;
      initChart();
    }
  }

  onMount(() => {
    if (filteredDangerClients.length > 0 || filteredUnstartedClients.length > 0) {
      initChart();
    }
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  });

  function setChartMode(mode) {
    chartMode = mode;
  }

  // Calculate totals for stats
  $: totalClients = filteredDangerClients.length + filteredUnstartedClients.length;
</script>

<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h3 class="text-lg font-bold text-gray-900">🎯 Client Distribution Analytics</h3>
      <p class="text-sm text-gray-500">Interactive breakdown of client patterns & risk distribution</p>
    </div>
    <div class="flex items-center space-x-2">
      <!-- Chart Mode Toggle - Enhanced -->
      <div class="flex bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1 shadow-inner">
        <button
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 {chartMode === 'severity' ? 'bg-white text-red-600 shadow-md scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}"
          on:click={() => setChartMode('severity')}
        >
          <div class="flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
            <span>Risk Levels</span>
          </div>
        </button>

        <button
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 {chartMode === 'workplace' ? 'bg-white text-purple-600 shadow-md scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}"
          on:click={() => setChartMode('workplace')}
        >
          <div class="flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-9 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <span>Workplaces</span>
          </div>
        </button>

        <button
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 {chartMode === 'job' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}"
          on:click={() => setChartMode('job')}
        >
          <div class="flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V2m0 4V2m0 4v2a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8m8 12v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2m8 0v2H8v-2"/>
            </svg>
            <span>Job Titles</span>
          </div>
        </button>

        <button
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 {chartMode === 'activity' ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}"
          on:click={() => setChartMode('activity')}
        >
          <div class="flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <span>Activity Overview</span>
          </div>
        </button>
      </div>

      <!-- Refresh Button -->
      <button
        class="p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl"
        on:click={onRefresh}
        title="Refresh chart data"
      >
        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>

      {#if totalClients > 0}
        <div class="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg font-semibold">
          Total: {totalClients} clients
        </div>
      {/if}
    </div>
  </div>

  {#if totalClients > 0}
    <!-- Chart View -->
    <div class="h-[350px] relative">
      <canvas bind:this={canvas}></canvas>
    </div>
  {:else}
    <!-- No Data State -->
    <div class="flex flex-col items-center justify-center py-16 text-gray-500" in:fly={{ y: 20, duration: 400 }}>
      <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <p class="text-sm font-semibold text-gray-700">No client data available</p>
      <p class="text-xs text-gray-500 mt-2">Add some clients to see distribution analytics</p>
    </div>
  {/if}
</div>