var chartKeyList = [];
var charts = {};
window.chartColors = {
    red: 'rgba(255, 52, 65, 1)',
    redb: 'rgba(255, 52, 65, 1)',
    yellow: 'rgba(225, 206,32,1)',
    yellowb: 'rgba(255, 196, 66, 1)',
    yellowl: 'rgba(225, 166, 36, 1)',
    blueb: 'rgba(54, 162, 235, 1)',
    blue: 'rgba(54, 162, 235, 1)',
    darkGray: 'rgba(54, 062, 035, 1)',
    purple: 'rgba(91, 37, 193, 1)',
    purpleb: 'rgba(91, 37, 193, 1)',
};

document.cookie.split(";")
    .filter(c => c.trim().startsWith('charts='))
    .map(c => c.trim().split('=')[1].split(',').map(c => c.length > 0?chartKeyList.push(c):false));

function prepareChart(key, type){
    var chartContainer = document.getElementById('chart-container');
    var chartDiv = document.createElement('div');
    if(type == 'stage'){
        chartDiv.setAttribute('class','shadow metric-chart metric-stage');
    }else{
        chartDiv.setAttribute('class','shadow metric-chart');
    }
    
    chartDiv.setAttribute('id', `container-${key}`);
    chartContainer.appendChild(chartDiv);

    var chartTitle = `[API] ${key}`;
    if(type == 'stage'){
        chartTitle = `[Stage] ${key}`;
    }

    var chartCanvas = document.createElement('canvas');
    chartCanvas.id = `chart-${key}`;
    chartCanvas.setAttribute('width', 480);
    chartCanvas.setAttribute('height', 260);
    chartDiv.appendChild(chartCanvas);

    drawChart(key, chartTitle);
    return setInterval(drawChart, 10000, key, chartTitle);
}

function drawChart(key, chartTitle){

    var request = new XMLHttpRequest();
    request.open('GET', `/metrics/api?key=${key}`);

    request.onload = function(e){
        let json = JSON.parse(request.response);

        let labels = Object.keys(json.series).map( k => new Date(Date.parse(k)).toLocaleTimeString().substring(0,5) );
        let data_request = Object.keys(json.series).map( k => json.series[k][key]?json.series[k][key].requests:0);
        let data_time = Object.keys(json.series).map( k => json.series[k][key]?json.series[k][key].avgTime.toFixed(2):0);
        let data_error = Object.keys(json.series).map( k => json.series[k][key]?json.series[k][key].errors:0);
        let data_circuitbreaker = Object.keys(json.series).map( k => json.series[k][key]?json.series[k][key].circuit_breaks:0);

        //console.log(data_request);

        if(charts[key] != undefined){
            removeData(charts[key]);
            addData(charts[key], labels, [data_error, data_circuitbreaker,data_request,data_time]);
            return;   
        }

        var ctx = document.getElementById(`chart-${key}`).getContext('2d');
        var metricChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        lineTension: 0.000001,
                        label: 'Errors',
                        data: data_error,
                        yAxisID: 'A',
                        backgroundColor: window.chartColors.redb,
                        borderColor: window.chartColors.red,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false
                    },
                    {
                        lineTension: 0.000001,
                        label: 'Circuit Breaks',
                        data: data_circuitbreaker,
                        yAxisID: 'A',
                        backgroundColor: window.chartColors.purpleb,
                        borderColor: window.chartColors.purple,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false
                    },
                    {
                        lineTension: 0.000001,
                        label: 'RPMs',
                        data: data_request,
                        yAxisID: 'A',
                        backgroundColor: window.chartColors.blueb,
                        borderColor: window.chartColors.blue,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false
                    },
                    
                    {
                        lineTension: 0.000001,
                        label: 'AVG Time (ms)',
                        data: data_time,
                        yAxisID: 'B',
                        backgroundColor: window.chartColors.yellowb,
                        borderColor: window.chartColors.yellow,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: false,
				title: {
                    display: true,
                    fontColor: window.chartColors.darkGray,
                    fontSize: 15,
					text: chartTitle
                },
                legend: {
                    display: true,
                    fontSize: 8
                 },
				tooltips: {
					mode: 'index',
					intersect: false,
				},
				hover: {
					mode: 'nearest',
					intersect: true
				},
                animation: {
                    duration: 0,
                },
                scales: {
                    yAxes: [
                    //     {
                    //     id: 'C',
                    //     type: 'linear',
                    //     position: 'left',
                    //     ticks: {
                    //         beginAtZero:true,
                    //         fontColor: window.chartColors.red ,
                    //         callback: function(value, index, values) {
                    //             if(value >= 1000){
                    //                 return (value /1000) +"k";
                    //             }
                    //             return value;
                    //         }
                    //     },
                    //     scaleLabel: {
					// 		display: true,
					// 		labelString: 'Errors'
					// 	},
                    //     gridLines: {
                    //         display: true,
					//         drawBorder: true,
                    //         //drawOnChartArea: false,
                    //         drawTicks: true
                    //     }
                    // },
                    {
                        id: 'A',
                        type: 'linear',
                        position: 'left',
                        ticks: {
                            beginAtZero:true,
                            fontColor: window.chartColors.blue,
                            callback: function(value, index, values) {
                                if(value >= 1000){
                                    return (value /1000) +"k";
                                }
                                return value;
                            }
                        },
                        scaleLabel: {
							display: true,
							labelString: 'RPM'
						},
                        gridLines: {
                            display: true,
					        drawBorder: true,
                            //drawOnChartArea: false,
                            drawTicks: true
                        }
                    }, {
                        id: 'B',
                        //type: 'linear',
                        position: 'right',
                        ticks: {
                            beginAtZero:true,
                            fontColor: window.chartColors.yellowl,
                            callback: function(value, index, values) {
                                if(value < 1){
                                    value.toFixed(2);
                                }else{
                                    value;
                                }
                                
                                if(value >= 1000){
                                    value = (value/1000)+"k";
                                }

                                return value;
                            }
                        },
                        scaleLabel: {
							display: true,
							labelString: 'Time (ms)'
						},
                        gridLines: {
                            display: true,
					        drawBorder: true,
                            drawOnChartArea: false,
                            drawTicks: true
                        }
                    }],
                    xAxes:[{
                        gridLines: {
                            display: true,
					        drawBorder: true,
                            //drawOnChartArea: false,
                            drawTicks: true
                        },
                        ticks: {
                            //fontColor: window.chartColors.yellowl,
                            fontSize: 10,
                            callback: function(value, index, values) {
                                if(index % 3 > 0)return "";
                                return value;
                            }
                        },
                    }]
                }
            }
        });
        charts[key] = metricChart;
    }
    request.send();
}


var toggles = document.getElementsByClassName('metrics-toggle');
for(var i=0; i<toggles.length; i++){
    
    toggles[i].addEventListener('click', function(e){
        var key = this.getAttribute('data-key');

        if( this.getAttribute('data-time-id') != null && !isNaN(this.getAttribute('data-time-id')*1) ){
            clearInterval(this.getAttribute('data-time-id'));
            document.getElementById(`container-${key}`).remove();
            this.setAttribute('data-time-id', undefined);
            chartKeyList.splice(chartKeyList.indexOf(key), 1);
            delete charts[key];
            document.cookie = `charts=${chartKeyList}`;
            this.getElementsByTagName('i')[0].setAttribute('class','fas fa-eye-slash text-secondary');
        }else{
            var timeId = prepareChart(key, this.getAttribute('data-chart-type'));
            this.setAttribute('data-time-id', timeId);
            chartKeyList.push(key);
            document.cookie = `charts=${chartKeyList}`;
            this.getElementsByTagName('i')[0].setAttribute('class','fas fa-eye text-danger');
        }
    });
}

function removeData(chart) {
    chart.data.labels = [];
    chart.data.datasets.forEach(d => d.data.pop());
}

function addData(chart, label, data) {
    chart.data.labels = label;
    chart.data.datasets[0].data = data[0];
    chart.data.datasets[1].data = data[1];
    chart.data.datasets[2].data = data[2];
    chart.data.datasets[3].data = data[3];
    chart.update();
}

chartKeyList.map( c => {
    var elements = document.getElementsByClassName('metrics-toggle');
    for(var i=0;i<elements.length;i++){
        if(elements[i].getAttribute('data-key') == c){
            var type = elements[i].getAttribute('data-chart-type');
            var timeId = prepareChart(c, type);
            elements[i].setAttribute('data-time-id', timeId);
            elements[i].getElementsByTagName('i')[0].setAttribute('class','fas fa-eye text-danger');
        }
    }
});