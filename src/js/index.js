
// Global variables
var t0 = 0;
var subsys = "", // Subsystem (i.e. CSC, DT, EMTF, etc.)
var cur_sample = "none"; // So script knows what sample is selected
var data_info = ""; // To be sent with query
var ref_info = ""; // To be sent with query
var prefix = ""; // Sample name that is placed in front of dataset name

// Form functions
function updt_sample() {

    if (cur_sample == "SingleMuon" || cur_sample == "Cosmics") {
        data_info = document.getElementById(cur_sample + "_dataInput").value;
        ref_info = document.getElementById(cur_sample + "_refInput").value;
        prefix = cur_sample;
    }
    check_input();
}

function check_input() {
    var passed = true;

    // Sample form filled
    if (cur_sample == "SingleMuon" || cur_sample == "Cosmics") {
        if  (document.getElementById(cur_sample + "_dataInput").value != "" && document.getElementById(cur_sample + "_refInput").value != "") {
            $("#sample_chk").attr('class', 'list-group-item list-group-item-success')
        }

        else {
            $("#sample_chk").attr('class', 'list-group-item list-group-item-danger');
            passed = false;
        }
    }
    if (cur_sample == "none") {
        $("#sample_chk").attr('class', 'list-group-item list-group-item-danger');
        passed = false;
    }

    // Toggle submit button
    if (passed) {
        $("#submit").removeAttr('disabled');
    }
    else {
        $("#submit").attr('disabled', 'disabled');
    }
}

// End form functions

// Query handlers
function pass_object(new_object) {
    url = (window.location.href + "plots.php?query=" + encodeURIComponent(new_object));
    document.location.href = url;
}

function handle_response(response) {
    console.log(response); 
    console.log("Run time: " + String(Math.floor(Date.now() / 1000) - t0));
    try {
        // Handle output from main.py
        console.log("query to be stored:");
        console.log(response["query"]);
        console.log("response:");
        console.log(response["response"]["payload"]);
        var resp = response["response"];

        if (resp["status"] == "fail") {
            $("#internal_err").text(resp["fail_reason"]);
            $("#submit").show();
            $("#internal_err").show();
        }                            

        else {
            if (cur_sample == "SingleMuon" || cur_sample == "Cosmics") {
                localStorage["data"] = response["query"]["data_info"];
                localStorage["ref"] = response["query"]["ref_info"];
                localStorage["user_id"] = response["query"]["user_id"];
            }
            reduced_resp = [localStorage["data"], localStorage["ref"], localStorage["user_id"]];
            pass_object(reduced_resp);
            $("#finished").show();
        }
    }
    catch(TypeError) {
        // Handle crashes, system error, timeouts, etc.
        console.log(response["responseText"]);
        var resp_txt = response["responseText"];
        var err_msg = "";
        
        console.log(resp_txt.indexOf("504"));
        if (resp_txt.indexOf("504") <= -1) {
            err_msg = "Error: Gateway timed out. Could not reach server."
        }
        else {
            err_msg = "Error: An internal error occured."
        }

        $("#internal_err").text(err_msg);

        $("#submit").show();
        $("#internal_err").show();
    }
    finally {
        $("#load").hide();
        $("#load_msg").text("Loading...");
        $("#load_msg").hide();
    }
}

function handle_processes(response) {
    console.log(response); 
    console.log("Run time: " + String(Math.floor(Date.now() / 1000) - t0));

    try {
        // Handle output from main.py
        console.log("query to be stored:");
        console.log(response["query"]);
        console.log("response:");
        console.log(response["response"]["payload"]);
        var resp = response["response"];

        if (resp["status"] == "fail") {
            $("#load").hide()
            $("#load_msg").hide()
            $("#internal_err").text(resp["fail_reason"]);
            $("#submit").show();
            $("#internal_err").show();
        }                            

        else if (response["query"]["type"] == "retrieve_data") {
            console.log("data retrieved");
            $("#load_msg").text("Loading reference...")
            response["query"]["type"] = "retrieve_ref";
            submit(response["query"]);
        }

        else if (response["query"]["type"] == "retrieve_ref") {
            console.log("processing")
            response["query"]["type"] = "process";
            $("#load_msg").text("Processing...")
            $.ajaxSetup({timeout:0});
            $.get("src/scripts/handler.py", response["query"])
                .done(function(response) {})
                .always(handle_response);
        }
    }
    catch(TypeError) {
        // Handle crashes, system error, timeouts, etc.
        console.log(response["responseText"]);
        var resp = response["responseText"];
        var err_msg = "";

        console.log(resp.indexOf("504"));
        if (resp.indexOf("504") > -1) {
            err_msg = "Error: Gateway timed out. Could not reach server."
        }
        else {
            err_msg = "Error: An internal error occured."
        }

        $("#load").hide()
        $("#load_msg").hide()
        $("#internal_err").text(err_msg);

        $("#submit").show();
        $("#internal_err").show();
    }

}

function submit(query) {
    console.log("retrieving");
    console.log(query);
    $("#load").show();
    $("#load_msg").show();
    $("#submit").hide();
    $("#finished").hide();
    $("#input_err").hide();
    $("#internal_err").hide();
    t0 = Math.floor(Date.now() / 1000);
    console.log(t0);

    $.ajaxSetup({timeout:0}); // Set timeout to 5 minutes
    $.get("src/scripts/handler.py", query)
        .done(function(response) {})
        .always(handle_processes);
}

function get_search(external_query) {
    // Use json to get object from stringified search query
    new_query = JSON.parse(external_query);
    $("#sample_list").val(new_query["sample"]);
    $("#" + new_query["sample"]).show();
    $("#data_sample").text("/" + new_query["sample"] + "/");
    $("#ref_sample").text("/" + new_query["sample"] + "/");

    cur_sample = new_query["sample"];
    if (new_query["sample"] == "SingleMuon") {
        $("#SingleMuon_dataInput").val(new_query["data_info"]);
        $("#SingleMuon_refInput").val(new_query["ref_info"]);
        prefix = "SingleMuon";
    
    }
    if (new_query["sample"] == "Cosmics") {
        $("#Cosmics_dataInput").val(new_query["data_info"]);
        $("#Cosmics_refInput").val(new_query["ref_info"]);
        prefix = "Cosmics";
    
    }
    check_input();
    updt_sample();

    $("#load").hide();
    $("#load_msg").hide();
    $("#finished").hide();
    $("#input_err").hide();
    $("#internal_err").hide();
    submit(new_query);
}
// End query handlers

// Main function
$(function() {
    console.log(localStorage);
    // Initital hides
    $("#load").hide();
    $("#load_msg").hide();
    $("#finished").hide();
    $("#input_err").hide();
    $("#internal_err").hide();
    $("#SingleMuon").hide();
    $("#Cosmics").hide();

    // Initial Disables
    $("#submit").attr('disabled', 'disabled');

    // Update plots link if search stored in local storage
    if (localStorage.hasOwnProperty("data")) {
        $("#plots_url").attr('href', window.location.href + "plots.php?query=" + encodeURIComponent([localStorage["data"], localStorage["ref"], localStorage["user_id"]]));
    }

    // If user refreshes after a search has failed, ensures that all form info will be properly stored
    check_input();

    // Prevent 'enter' key from submitting forms (gives 404 error with full data set name form)
    $(window).keydown(function(event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            return false;
        }
    });

    // Select menu functions
    $("#sample_list").val("none");
    $("#sample_list").on('change', function() {
        // Store current sample (global variable)
        cur_sample = this.value;
        prefix = this.value;

        // Reset fields
        if (cur_sample != "none"){
            $("#" + cur_sample)[0].reset();
            updt_sample();
        }

        // Show proper input for selected sample
        var opts = document.getElementById("sample_list").options;
        for ( var i = 0; i < opts.length; i++ ) {
            if (opts[i].value == this.value) {
                $("#" + this.value).show();
            }
            else {
                $("#" + opts[i].value).hide();
            }
        }
    });

    // Main query handler
    $("#submit").click(function(){
        $("#load").hide();
        $("#load_msg").text("Loading data...")
        $("#finished").hide();
        $("#input_err").hide();
        $("#internal_err").hide();
        var query = {
            "subsys": subsys,
            "type": "retrieve_data",
            "sample": cur_sample,
            "data_info": data_info,
            "ref_info": ref_info,
            "user_id": Date.now(), 
        };
        submit(query);
    });

    // Update form if query passed from search page
    if (localStorage.hasOwnProperty("external_query")) {
        get_search(localStorage["external_query"]);
        localStorage.removeItem("external_query");
    }

});

