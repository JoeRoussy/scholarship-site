import Chart from 'chart.js';

export default () => {
    const userPlot = $('#userPlot');

    if (userPlot.length) {
        // Configure the data for the plot
        const sourceData = JSON.parse(userPlot.attr('source-data'));
        
        const {
            userData,
            memberData
        } = sourceData;
        
        const labels = Object.keys(userData);
        let userValues = [];
        let memberValues = [];

        Object.keys(userData).forEach(key => {
            userValues.push(userData[key]);
        });

        Object.keys(memberData).forEach(key => {
            memberValues.push(memberData[key]);
        });

        // Now that the data is in the right form, plot the graph
        const userChart = new Chart(userPlot, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Users',
                        data: userValues,
                        fill: false,
                        borderColor: '#2185d0' // Blue
                    },
                    {
                        label: 'Members',
                        data: memberValues,
                        fill: false,
                        borderColor: '#21ba45' // Green
                    }
                ]
            }
        });
    }

    const applicationPlot = $('#applicationPlot');

    if (applicationPlot.length) {
        // Configure the data for the plot
        const sourceData = JSON.parse(applicationPlot.attr('source-data'));

        const labels = Object.keys(sourceData);
        let values = [];

        Object.keys(sourceData).forEach(key => {
            values.push(sourceData[key]);
        });

        const applicationChart = new Chart(applicationPlot, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        data: values,
                        fill: false,
                        borderColor: '#21ba45' // Green
                    }
                ]
            }
        });
    }
};