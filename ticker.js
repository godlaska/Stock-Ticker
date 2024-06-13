// Initalize Global Variables
var exchangeURL = "https://api.polygon.io/v3/reference/exchanges?asset_class=stocks";
// Splitting URL into two parts for less messy code and to add a variable argument
var stockURLp1 = "https://api.polygon.io/v3/reference/tickers?exchange=";
var stockURLp2 = "&active=true&apiKey=sGWTm8OFz8td9f_63reiQBqhfhILt2mB";
// Split URL of stock information 
var stockInfoURLp1 = "https://api.polygon.io/v1/open-close/";
var stockInfoURLp2 = "?adjusted=true&apiKey=sGWTm8OFz8td9f_63reiQBqhfhILt2mB";
// Map to hold all the mic values of the exchanges. Useful for determining stocks [name -> mic]
var micMap = new Map();
// Map to hold all stock names and tickers. Useful in displaying correct stock name. [ticker -> name]
var stockNameMap = new Map();

var primaryApiKey = "sGWTm8OFz8td9f_63reiQBqhfhILt2mB";
var backupApiKey = "r2E6R7GkfyrSA3m00RG98Rz3uuAmFSWf";
var apiKeyInUse = primaryApiKey;

// Keep track of API call counts
var apiCallsCount = 0;
var lastApiCallTime = null;

// Get the current date
var currentDate = new Date();

// Subtract one day to get yesterday's date
var oneDay = 24 * 60 * 60 * 1000; // One day in milliseconds
var yesterday = new Date(currentDate.getTime() - oneDay);

// Format yesterday's date as "yyyy-mm-dd"
var yesterdayFormatted = formatDate(yesterday);

// Function to format date as "yyyy-mm-dd"
function formatDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

// Function to check if an API call can be made based on rate limit
function canMakeAPICall() {
    var currentTime = new Date();
    if (lastApiCallTime === null || currentTime - lastApiCallTime >= 60000) {
        // Reset API call count and update last call time
        apiCallsCount = 0;
        lastApiCallTime = currentTime;
        return true;
    } else {
        // Check if rate limit has been reached
        return apiCallsCount < 10;
    }
}

// Function to switch API key if rate limit is reached
function switchApiKeyIfNeeded() {
    if (apiCallsCount >= 10) {
        apiKeyInUse = (apiKeyInUse === primaryApiKey) ? backupApiKey : primaryApiKey;
        apiCallsCount = 0; // Reset API call count
        lastApiCallTime = new Date(); // Update last call time
    }
}

// Function to handle 429 error without making an API call
function handle429Error() {
    switchApiKeyIfNeeded();
    console.log("Switched to key ", apiKeyInUse);
    $("#selectedExchangeSpan").text(""); // Clear selected exchange
    $("#selectedStockSpan").text(""); // Clear selected stock
    $("#errorMessage").show().text("You've exceeded the API rate limit. Please wait a minute before trying again.").addClass("text-danger"); // Display red error message
    $("#refreshMessage").show().html("Please refresh <a href='stocks.html'>here.</a>"); // Show the refresh message
    $("#selectedStock").html("Stock: "); // Resets stock listing
}

// Function to make API calls
function makeAPICall(url, successCallback, failureCallback) {
    if (canMakeAPICall()) {
        $.ajax({
            url: url,
            method: "GET",
        }).done(function(data) {
            successCallback(data);
            apiCallsCount++; // Increment API call count
        }).fail(function(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 429 || jqXHR.status == 404) {
                handle429Error();
            } else {
                failureCallback(jqXHR, textStatus, errorThrown);
            }
        });
    } else {
        // Handle rate limit reached
        handle429Error();
    }
}

// Function to update exchanges
function updateExchanges() {
    makeAPICall(exchangeURL + '&apiKey=' + apiKeyInUse, function(data) {
        for (var i = 0; i < data.results.length; i++) {
            $("#exchangeDropdown").append("<option value='" + data.results[i].name + "'>" + data.results[i].name + "</option>");
            micMap.set(data.results[i].name, data.results[i].mic);
        }
        updateExchangeHeader();
        $("#refreshMessage").hide(); // Hide the refresh message if API call succeeds
    }, function(jqXHR, textStatus, errorThrown) {
        console.log("Error fetching exchanges:", textStatus);
    });
}

// Function to update exchange stocks
function updateExchangeStocks() {
    var exchangeMic = micMap.get($("#exchangeDropdown").val());
    if (exchangeMic) {
        makeAPICall(stockURLp1 + exchangeMic + stockURLp2, function(data) {
            if (data.results && data.results.length > 0) {
                $("#tickerListing").empty();
                for (var i = 0; i < data.results.length; i++) {
                    $("#tickerListing").append("<option value='" + data.results[i].ticker + "'>" + data.results[i].ticker + "</option>");
                    stockNameMap.set(data.results[i].ticker, data.results[i].name);
                }
                // Update stock header and information for the first stock
                var firstStockTicker = data.results[0].ticker;
                updateStockHeader(firstStockTicker);
                updateStockInformation(firstStockTicker);
                // Call updateNews with the selected stock ticker
                updateNews(firstStockTicker);
                // Call the chart
                createStockChart(firstStockTicker);

                // Store the stock ticker/name and exchange in local storage
                var firstStockName = data.results[0].name;
                localStorage.setItem('selectedTicker', firstStockTicker);
                localStorage.setItem('exchange', exchangeMic);
                localStorage.setItem('tickerName', firstStockName);
            } else {
                console.log("No results found or invalid data.");
                $("#tickerListing").empty();
                updateStockHeader();
            }
        }, function(jqXHR, textStatus, errorThrown) {
            console.log("Error fetching stocks:", textStatus);
        });
    }
}

function getPreviousTradingDays() {
    let currentDate = new Date(); // Get the current date
    let previousDay = new Date(currentDate); // Create a copy of the current date
    let previousTwoDays = new Date(currentDate); // Create another copy of the current date

    // Calculate the previous trading day (excluding weekends)
    do {
        previousDay.setDate(previousDay.getDate() - 1);
    } while (previousDay.getDay() === 0 || previousDay.getDay() === 6); // Skip Sunday (0) and Saturday (6)

    return {
        previousTradingDay: formatDate(previousDay),
        previousTwoTradingDays: formatDate(previousTwoDays)
    };
}

const { previousTradingDay, previousTwoTradingDays } = getPreviousTradingDays();

// Function to update stock information
function updateStockInformation(stockTicker) {
    makeAPICall(stockInfoURLp1 + stockTicker + "/" + previousTradingDay + stockInfoURLp2, function(data) {
        // Store the selected ticker in local storage
        localStorage.setItem('selectedTicker', stockTicker);
        favorited(); // Runs the check if favorited logic

        $("#openVal").html("Open: $" + data.open);
        $("#highVal").html("High: $" + data.high);
        $("#lowVal").html("Low: $" + data.low);
        $("#closeVal").html("Close: $" + data.close);

        // Retrieve the previous day's close from local storage
        var prevClose = localStorage.getItem('prevClose');
        if (prevClose) {
            // Calculate percent difference
            var currentClose = data.close;

            var percentDiff = ((currentClose - prevClose) / prevClose) * 100;

            // Display percent difference with appropriate image
            var diffText = "Daily % Difference: " + percentDiff.toFixed(2) + "%";
            if (percentDiff > 0) {
                diffText += "<img id='stockArrow' src='images/green-up.png' alt='Up'>";
            } else if (percentDiff < 0) {
                diffText += "<img id='stockArrow' src='images/red-down.png' alt='Down'>";
            }
            $("#prevCloseDifference").html(diffText);
        } else {
            console.log("Previous day's close not found in local storage.");
        }

        $("#volume").html("Volume: " + data.volume);
        console.log("Stock information updated successfully.");
    }, function(jqXHR, textStatus, errorThrown) {
        console.log("Error fetching stock information:", textStatus);
    });
}

// Function to update the header based on selected stock
function updateStockHeader(selectedStock) {
    if (selectedStock && stockNameMap.has(selectedStock)) {
        $("#selectedStock").html("Stock: " + stockNameMap.get(selectedStock));
    } else {
        $("#selectedStock").html("No Stocks To Display");
    }
}

// Function to update the header based on selected stock
function updateExchangeHeader(selectedStock) {
    if(selectedStock) {
        $("#selectedExchange").html("Exchange: " + selectedStock);
    } else {
        $("#selectedExchange").html("Exchange: " + $("#exchangeDropdown").val());
    }
}

// Function to update news
function updateNews(ticker) {
    var newsURL = "https://api.polygon.io/v2/reference/news?ticker=" + ticker + "&limit=10&apiKey=" + apiKeyInUse;

    makeAPICall(newsURL, function(data) {
        $('#newsContainer').html(""); // Clear news
        // Assuming data contains news information
        // Update your HTML to display the news information
        data.results.slice(0, 5).forEach(function(newsItem, index) {
            var bgColorClass = index % 2 === 0 ? 'bg-white' : 'bg-dark-gray';
            var newsHtml = '<div class="news-item ' + bgColorClass + '">';
            newsHtml += '<div class="news-title"><strong>' + newsItem.title + '</strong></div>';
            newsHtml += '<div class="news-publisher" style="font-style: italic;">Published by: ' + newsItem.publisher.name + '</div>';
            newsHtml += '<div class="news-description">' + newsItem.description + '</div>';
            newsHtml += '<div class="news-link"><a href="' + newsItem.article_url + '" target="_blank">Read more</a></div>';
            newsHtml += '</div>';
            $('#newsContainer').append(newsHtml);
            $('#newsContainer').append("<hr>");
        });
        console.log("News updated successfully:", data);
    }, function(jqXHR, textStatus, errorThrown) {
        console.log("Error fetching news:", textStatus);
    });
}

// Function to update the stock chart
function updateStockChart(stockTicker) {
    // API URL for fetching stock closing prices for the last five trading days
    var apiUrl = "https://api.polygon.io/v2/aggs/ticker/" + stockTicker + "/range/1/day/";
    // Calculate start and end dates for the last five trading days
    var endDate = formatDate(currentDate); // Today's date
    var startDate = formatDate(getFiveTradingDaysAgo(currentDate)); // Five trading days ago

    // Construct the API URL with start and end dates
    var fullApiUrl = apiUrl + startDate + "/" + endDate + "?adjusted=true&sort=asc&apiKey=" + apiKeyInUse;

    // Make the API call
    makeAPICall(fullApiUrl, function(data) {
        // Process the API response and update the chart
        if (data && data.results && data.results.length > 0) {
            var closingPrices = [];
            var dates = [];
            data.results.forEach(function(result) {
                closingPrices.push(result.c);
                dates.push(new Date(result.t).toLocaleDateString()); // Format date as MM/DD/YYYY
            });

            // Clear the previous day's close from local storage
            localStorage.removeItem('prevClose');

            // Store the previous day's close in local storage
            var prevClose = data.results[data.results.length - 2].c;
            localStorage.setItem('prevClose', prevClose);

            // Get the existing chart instance
            var existingChart = Chart.getChart("stockChart");

            // Update chart data
            existingChart.data.labels = dates;
            existingChart.data.datasets[0].data = closingPrices;

            // Update the chart
            existingChart.update();
        } else {
            console.log("No stock chart data available.");
        }
    }, function(jqXHR, textStatus, errorThrown) {
        console.log("Error fetching stock chart data:", textStatus);
    });
}

// Function to update the stock chart
function createStockChart(stockTicker) {
    // API URL for fetching stock closing prices for the last five trading days
    var apiUrl = "https://api.polygon.io/v2/aggs/ticker/" + stockTicker + "/range/1/day/";
    // Calculate start and end dates for the last five trading days
    var endDate = formatDate(currentDate); // Today's date
    var startDate = formatDate(getFiveTradingDaysAgo(currentDate)); // Five trading days ago

    // Construct the API URL with start and end dates
    var fullApiUrl = apiUrl + startDate + "/" + endDate + "?adjusted=true&sort=asc&apiKey=" + apiKeyInUse;

    // Make the API call
    makeAPICall(fullApiUrl, function(data) {
        // Process the API response and update the chart
        if (data && data.results && data.results.length > 0) {
            var closingPrices = [];
            var dates = [];
            data.results.forEach(function(result) {
                closingPrices.push(result.c);
                dates.push(new Date(result.t).toLocaleDateString()); // Format date as MM/DD/YYYY
            });

            // Clear the previous day's close from local storage
            localStorage.removeItem('prevClose');

            // Store the previous day's close in local storage
            var prevClose = data.results[data.results.length - 2].c;
            localStorage.setItem('prevClose', prevClose);

            // Now you can update your chart using the closingPrices array and dates array
            // Sample code to update a Chart.js chart
            var ctx = document.getElementById('stockChart').getContext('2d');
            var stockChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Closing Price',
                        data: closingPrices,
                        borderColor: 'rgba(68, 183, 194, 1)',
                        borderWidth: 2,
                        fill: {
                            target: 'origin',
                            above: 'rgba(2, 75, 122, 0.7)' // Fill color for area below the line
                        },
                        pointBackgroundColor: 'rgba(2, 75, 122, 1)', // Fill color for dots (white)
                        pointRadius: 4, // Adjust dot size
                        pointHoverRadius: 6 // Adjust dot hover size
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: false,
                            ticks: {
                                callback: function(value, index, values) {
                                    // Convert value to string and split into parts before and after the decimal point
                                    var parts = value.toString().split('.');
                                    var dollars = parts[0];
                                    var cents = parts.length > 1 ? parts[1] : '00'; // Pad with zeros if no cents
            
                                    // Return formatted value as $xxxx.xx
                                    return '$' + dollars + '.' + cents.padEnd(2, '0');
                                }
                            }
                        }
                    }
                }
            });
        } else {
            console.log("No stock chart data available.");
        }
    }, function(jqXHR, textStatus, errorThrown) {
        console.log("Error fetching stock chart data:", textStatus);
    });
}

// Gets previous trading day
function getPreviousDay(date) {
    var previousDate = new Date(date.getTime());
    previousDate.setDate(previousDate.getDate() - 1); // Move one day back
    return previousDate;
}

// Function to get the date five trading days ago
function getFiveTradingDaysAgo(date) {
    var count = 0;
    var currentDate = new Date(date.getTime());
    while (count < 5) {
        currentDate.setDate(currentDate.getDate() - 1); // Move one day back
        if (isTradingDay(currentDate)) {
            count++;
        }
    }
    return currentDate;
}

// Function to check if a given date is a trading day (excluding weekends)
function isTradingDay(date) {
    var dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
}

// Function that checks if a stock ticker has been favorited or not
function favorited(stockTicker) {
    var button = document.getElementById('favoriteButton');
    var username = localStorage.getItem('fullName');
    var exchange = localStorage.getItem('exchange');
    var tickerName = localStorage.getItem('tickerName');
    var selectedTicker = localStorage.getItem('selectedTicker'); // Retrieve selectedTicker from local storage

    console.log("Selected Ticker from Local Storage:", selectedTicker);

    if (!username) {
        console.error("Username not found in local storage");
        document.getElementById('favoriteMessage').innerHTML = 'Please <a href="login.html">sign in</a> to add favorites.';
        document.getElementById('favoriteMessage').style.display = 'block';
        return;
    }

    var url = "http://172.17.13.115/final.php/getFromFavorites"; // URL to handle favorite toggling
    var data = {
        username: username,
        ticker: selectedTicker,
        exchange: exchange,
        tickerName: tickerName,
    };

    // Enclose AJAX call in a while loop to handle stock tickers while the JSON array still has data
    $.ajax({
        url: url,
        method: "POST",
        data: data,
    })
    .done(function(response) {  
        // Logic for updating favorites table
        var favoritesList = document.getElementById('favoritesList');
        favoritesList.innerHTML = ''; // Clear previous content

        var tableHtml = '<table class="table mx-auto">'; // Added "table mx-auto" class for centering
        tableHtml += '<tr><th class="header-spacing"></th><th class="header-spacing"></th></tr>';

        for (let i = 0; i < response.data.length; i++) {
            let stockTicker = response.data[i].ticker;
            tableHtml += '<tr class="highlight-row">';
            tableHtml += '<td class="header-spacing">' + stockTicker + '</td>';
            tableHtml += '<td><button type="button" class="btn btn-info" onclick="updateAllInfo(\'' + stockTicker + '\')">View Details</button></td>';
            tableHtml += '</tr>';
        }

        tableHtml += '</table>';
        favoritesList.innerHTML = tableHtml;


        let isFavorited = false; // Initialize a flag to track if the selected ticker is favorited

        // Checks if the stock is favorited
        for (let i = 0; i < response.data.length; i++) {
            let stockTicker = response.data[i].ticker;
            console.log("Toggle favorite response:", response);

            if (selectedTicker === stockTicker) { // Check if selectedTicker matches the current stockTicker
                if (response.status == 0) { // Check if data is good
                    isFavorited = true; // Set the flag to true since the selectedTicker is favorited
                    break; // Exit the loop since the selected stock is found
                } else {
                    console.error("Toggle favorite error:", response.message);
                }
            }
        }

        if (isFavorited) {
            console.log(selectedTicker, " is favorited");
            button.innerHTML = 'Favorited <span class="gold-star">★</span>';
            button.classList.add('favorited');
        } else {
            console.log(selectedTicker, " is NOT favorited");
            button.innerHTML = 'Favorite ✰';
            button.classList.remove('favorited');
        }
        button.disabled = false;     
    })
    .fail(function(error) {
        console.error("Error:", error);
        $("#favoriteError").html("Please <a href='index.html'>sign in</a> to favorite stocks!");
    });
}

// Helper function for clicking the favorite button
function checkFavoriteStatus() {
    var button = document.getElementById('favoriteButton');
    if (button.classList.contains('favorited')) {
        removeFromFavorites();
    } else {
        addToFavorites();
    }
}

function addZeroPrefix(value) {
    return value < 10 ? '0' + value : value;
}

function addToFavorites() {
    var button = document.getElementById('favoriteButton');
    var username = localStorage.getItem('fullName');
    var selectedTicker = localStorage.getItem('selectedTicker'); // Retrieve selectedTicker from local storage

    if (!username || !selectedTicker) {
        console.error("Required data not found in local storage");
        document.getElementById('favoriteMessage').innerHTML = 'Please <a href="login.html">sign in</a> to add favorites.';
        document.getElementById('favoriteMessage').style.display = 'block';
        return;
    }

    console.log("Adding to favorites...");
    button.innerHTML = 'Favorited <span class="gold-star">★</span>';
    button.classList.add('favorited');

    var currentDate = new Date();
    var formattedDate = currentDate.getFullYear() + '-' + addZeroPrefix(currentDate.getMonth() + 1) + '-' + addZeroPrefix(currentDate.getDate());
    var formattedTime = addZeroPrefix(currentDate.getHours()) + ':' + addZeroPrefix(currentDate.getMinutes()) + ':' + addZeroPrefix(currentDate.getSeconds());

    var date = formattedDate + ' ' + formattedTime;

    var url = "http://172.17.13.115/final.php/addToFavorites"; // URL for adding to favorites
    var data = {
        username: username,
        ticker: selectedTicker,
        time: date,
    };

    // AJAX call to add to favorites
    $.ajax({
        url: url,
        method: "POST",
        data: data,
    })
    .done(function(response) {
        console.log("Add to favorites response:", response);
        addHistory(username, selectedTicker, date, 1);
    })
    .fail(function(error) {
        console.error("Error:", error);
    });
}

function removeFromFavorites() {
    var button = document.getElementById('favoriteButton');
    var username = localStorage.getItem('fullName');
    var selectedTicker = localStorage.getItem('selectedTicker'); // Retrieve selectedTicker from local storage

    if (!username || !selectedTicker) {
        console.error("Required data not found in local storage");
        document.getElementById('favoriteMessage').innerHTML = 'Please <a href="login.html">sign in</a> to add favorites.';
        document.getElementById('favoriteMessage').style.display = 'block';
        return;
    }

    console.log("Removing from favorites...");
    button.innerHTML = 'Favorite ✰';
    button.classList.remove('favorited');

    var currentDate = new Date();
    var formattedDate = currentDate.getFullYear() + '-' + addZeroPrefix(currentDate.getMonth() + 1) + '-' + addZeroPrefix(currentDate.getDate());
    var formattedTime = addZeroPrefix(currentDate.getHours()) + ':' + addZeroPrefix(currentDate.getMinutes()) + ':' + addZeroPrefix(currentDate.getSeconds());

    var date = formattedDate + ' ' + formattedTime;


    var url = "http://172.17.13.115/final.php/removeFromFavorites"; // URL for removing from favorites
    var data = {
        username: username,
        ticker: selectedTicker,
    };

    // AJAX call to remove from favorites
    $.ajax({
        url: url,
        method: "POST",
        data: data,
    })
    .done(function(response) {
        console.log("Remove from favorites response:", response);
        removeHistory(username, selectedTicker, date, 0);
    })
    .fail(function(error) {
        console.error("Error:", error);
    });
}

function addHistory(username, ticker, time, status) {
    var url = "http://172.17.13.115/final.php/addHistory"; // URL to add history entry
    var data = {
        username: username,
        ticker: ticker,
        time: time,
        status: status
    };

    $.ajax({
        url: url,
        method: "POST",
        data: data,
    })
    .done(function(response) {
        console.log("Add to history response:", response);
    })
    .fail(function(error) {
        console.error("Error:", error);
    });
}

function removeHistory(username, ticker, time, status) {
    var url = "http://172.17.13.115/final.php/removeHistory"; // URL to add history entry
    var data = {
        username: username,
        ticker: ticker,
        time: time,
        status: status
    };

    $.ajax({
        url: url,
        method: "POST",
        data: data,
    })
    .done(function(response) {
        console.log("Add to history response:", response);
    })
    .fail(function(error) {
        console.error("Error:", error);
    });
}

// Function to fetch and display history entries in ascending order
function historyASC() {
    var username = localStorage.getItem('fullName');
    var fromDate = $('#fromDateInput').val(); // Get value from 'From' date input field
    var toDate = $('#toDateInput').val(); // Get value from 'To' date input field

    // Set default dates if 'From' and 'To' date inputs are empty
    if (!fromDate) {
        fromDate = '2001-01-01'; // Set default 'From' date to January 1, 2001
    }
    if (!toDate) {
        var currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
        toDate = currentDate; // Set default 'To' date to current date
    }

    var url = "http://172.17.13.115/final.php/getAllFromHistoryASC"; // Default URL for getting history in ascending order

    $.ajax({
        url: url,
        method: "GET",
        data: { username: username},
    })
    .done(function(response) {
        console.log("History in ascending order:", response);
        $('#sortMode').html("Sort: Ascending <img id='sortArrow' src='images/up-arrow.png' alt='Up Arrow'>");
        displayHistoryEntries(response, fromDate, toDate); // Call function to display history entries with fromDate and toDate parameters
    })
    .fail(function(error) {
        console.error("Error fetching history in ascending order:", error);
    });
}

// Function to fetch and display history entries in descending order
function historyDESC() {
    var username = localStorage.getItem('fullName');
    var fromDate = $('#fromDateInput').val(); // Get value from 'From' date input field
    var toDate = $('#toDateInput').val(); // Get value from 'To' date input field

    // Set default dates if 'From' and 'To' date inputs are empty
    if (!fromDate) {
        fromDate = '2001-01-01'; // Set default 'From' date to January 1, 2001
    }
    if (!toDate) {
        var currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
        toDate = currentDate; // Set default 'To' date to current date
    }

    var url = "http://172.17.13.115/final.php/getAllFromHistoryDESC"; // Default URL for getting history in descending order
    var data = {
        username: username,
    };

    $.ajax({
        url: url,
        method: "POST",
        data: data,
    })
    .done(function(response) {
        console.log("History in descending order:", response);
        $('#sortMode').html("Sort: Descending <img id='sortArrow' src='images/down-arrow.png' alt='Down Arrow'>");
        displayHistoryEntries(response, fromDate, toDate); // Call function to display history entries with fromDate and toDate parameters
    })    
    .fail(function(error) {
        console.error("Error fetching history in descending order:", error);
    });
}

// Function to display history entries in the table
function displayHistoryEntries(historyData, fromDate, toDate, status) {
    console.log("Data:", historyData);
    var tableBody = $('#historyTableBody');
    tableBody.empty(); // Clear previous entries

    // Runs if there's no stock history
    if(historyData.data.length == 0) {
        $('#noFavoriteWarning').html("Favorite or unfavorite stocks to display them in history!")
    }

    // Iterate through historyData and append rows to the table
    for (var i = 0; i < historyData.data.length; i++) {
        var entry = historyData.data[i];
        var entryDate = new Date(entry.time).toISOString().split('T')[0]; // Extract date from entry's time

        // Check if entry's date falls within the specified time frame
        if (entryDate >= fromDate && entryDate <= toDate) {
            var statusText = entry.status === 1 ? "<span id='addedText'>Added</span>" : "<span id='removedText'>Removed</span>";
            var row = `<tr>
                            <td>${i + 1}</td>
                            <td style='font-weight: bold;'>${entry.ticker}</td>
                            <td>${fromDate}</td>
                            <td>${toDate}</td>
                            <td>${entry.time}</td>
                            <td>${statusText}</td>
                        </tr>`;
            tableBody.append(row);
        }
    }
}

function updateAllInfo(selectedStock) {
    console.log("Updating all info on", selectedStock);
    updateStockHeader(selectedStock); // Update stock header with the selected stock
    updateStockInformation(selectedStock); // Update stock information
    updateStockChart(selectedStock); // Create or update stock chart
    updateNews(selectedStock); // Update news
}

$(document).ready(function() {
    updateExchanges();
    favorited();
    createStockChart("TEST");
    historyDESC();

    // Call updateExchangeStocks when the exchange dropdown changes
    $("#exchangeDropdown").on("change", function() {
        updateExchangeStocks();
        updateExchangeHeader();
    });

    // Call updateStockInformation when the tickerListing dropdown changes
    $("#tickerListing").on("change", function() {
        var selectedStock = $(this).val(); // Get the selected stock ticker
        updateStockHeader(selectedStock); // Update stock header with the selected stock
        updateStockInformation(selectedStock); // Update stock information
        updateStockChart(selectedStock); // Create or update stock chart
        updateNews(selectedStock); // Updates the news
    });

    $('#fromDateInput').on("change", function() {
        historyASC();
    });

    $('#toDateInput').on("change", function() {
        historyASC();
    });

    // Check for 429 error upon document ready
    checkFor429Error();
});