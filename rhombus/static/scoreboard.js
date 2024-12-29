(function () {
  const chartElement = document.getElementById("chart");

  const setScoreboardTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (window.scoreboardChart) {
      window.scoreboardChart.dispose();
    }
    if (isDark) {
      window.scoreboardChart = echarts.init(chartElement, "dark", undefined);
    } else {
      window.scoreboardChart = echarts.init(chartElement, null, undefined);
    }
    if (window.mostRecentOptions)
      window.scoreboardChart.setOption(window.mostRecentOptions);
    window.scoreboardChart.resize();
  };

  setScoreboardTheme();
  const observer = new MutationObserver(() => setScoreboardTheme());
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  const refetchHandler = async () => {
    const scoreboard_data = await (
      await fetch(window.location.pathname + ".json", {
        headers: { accept: "application/json" },
      })
    ).json();
    render(scoreboard_data);
  };

  const resizeHandler = () => {
    window.scoreboardChart.resize();
  };

  window.addEventListener("resize", resizeHandler);
  window.addEventListener("focus", refetchHandler);
  const periodicRefetch = setInterval(refetchHandler, 1000 * 60 * 2);

  window.deregister = () => {
    window.removeEventListener("resize", resizeHandler);
    window.removeEventListener("focus", refetchHandler);
    clearInterval(periodicRefetch);
  };

  render(
    JSON.parse(document.getElementById("initial-scoreboard-json").innerHTML),
  );

  function render(scoreboard_data) {
    if (Object.values(scoreboard_data).length === 0) {
      document.getElementById("empty-banner").style.display = "flex";
    }

    const seriesCommon = {
      type: "line",
      emphasis: {
        focus: "series",
      },
      lineStyle: {
        width: 4,
        // cap: "round",
      },
      // symbolSize: 10,
    };

    const optionsCommon = {
      tooltip: {
        trigger: "axis",
        order: "valueDesc",
      },
      grid: {
        top: "70",
        left: "3%",
        right: "3%",
        bottom: "60",
        containLabel: true,
      },
      toolbox: {
        feature: {
          saveAsImage: {},
          dataZoom: {},
          myFullscreen: {
            show: true,
            title: "Fullscreen",
            icon: "path://M432.45,595.444c0,2.177-4.661,6.82-11.305,6.82c-6.475,0-11.306-4.567-11.306-6.82s4.852-6.812,11.306-6.812C427.841,588.632,432.452,593.191,432.45,595.444L432.45,595.444z M421.155,589.876c-3.009,0-5.448,2.495-5.448,5.572s2.439,5.572,5.448,5.572c3.01,0,5.449-2.495,5.449-5.572C426.604,592.371,424.165,589.876,421.155,589.876L421.155,589.876z M421.146,591.891c-1.916,0-3.47,1.589-3.47,3.549c0,1.959,1.554,3.548,3.47,3.548s3.469-1.589,3.469-3.548C424.614,593.479,423.062,591.891,421.146,591.891L421.146,591.891zM421.146,591.891",
            onclick() {
              document.exitFullscreen().catch(() => {});
              chartElement.requestFullscreen();
            },
          },
        },
      },
      xAxis: {
        type: "time",
        minInterval: 1000 * 60 * 60,
      },
      dataZoom: [
        {
          type: "slider",
          height: 20,
          top: 35,
        },
      ],
      animationDuration: 0,
      backgroundColor: "transparent",
      yAxis: {
        type: "value",
        min: 0,
        minInterval: 100,
      },
    };

    const timestampOffset = new Date().getTimezoneOffset() * 60;

    const series = Object.values(scoreboard_data).map((team) => ({
      name: team.team_name,
      data: team.series.map((d) => ({
        value: [d.timestamp * 1000 + timestampOffset, d.total_score],
      })),
      ...seriesCommon,
    }));

    const options = {
      ...optionsCommon,
      legend: {
        data: series.map((s) => s.name),
        type: "scroll",
        orient: "horizontal",
        align: "left",
        bottom: 20,
      },
      series,
    };

    window.mostRecentOptions = options;
    window.scoreboardChart.setOption(options, true);
  }
})();
