var count, tickinterval;

function broadcastTick() {
    $.post("/broadcast", {
        message: $("#ticking").text()
    });
}

function tick() {
    $("#ticking span").html(--count);

    if(count === 5) {
        broadcastTick();
        alert("Ready to reboot.");
    }
}

$(function() {
    $("#warn-update").click(function() {
        count = 60;
        $("#ticking").html("Server is rebooting for updates in <span>60</span> seconds.");
        tickinterval = setInterval(tick, 1000);
        broadcastTick();
    });
});