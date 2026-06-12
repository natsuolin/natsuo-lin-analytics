let chartInstance = null;

function initChart(elementId) {
    const options = {
        chart: {
            type: 'area',
            height: 300,
            toolbar: { show: false },
            animations: { enabled: true },
            background: 'transparent'
        },
        theme: { mode: 'dark' },
        stroke: { curve: 'smooth', width: 2, colors: ['#06b6d4'] },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.05,
                stops: [0, 100]
            }
        },
        dataLabels: { enabled: false },
        xaxis: {
            type: 'datetime',
            labels: { 
                style: { colors: '#9ca3af' },
                datetimeUTC: false // Displays client machine local time instead of zero UTC
            }
        },
        yaxis: {
            labels: {
                style: { colors: '#9ca3af' },
                formatter: (val) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
        },
        grid: { borderColor: '#1f2937' },
        // FEATURE: Interaction Configuration (Hover States)
        tooltip: {
            enabled: true,
            theme: 'dark',
            x: {
                show: true,
                format: 'dd MMM HH:mm:ss', // Displays Day, Short Month, Hour:Minute:Second in the floating card
            },
            y: {
                formatter: function (val) {
                    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
                },
                title: {
                    formatter: () => 'Price: ',
                }
            },
            marker: { show: true },
            style: { fontSize: '12px', fontFamily: 'sans-serif' }
        },
        series: [{ name: 'Price (USD)', data: [] }]
    };

    chartInstance = new ApexCharts(document.querySelector(elementId), options);
    chartInstance.render();
}

function updateChartData(pricesArray) {
    if (chartInstance) {
        chartInstance.updateSeries([{
            data: pricesArray
        }]);
    }
}