//A tabs layout requires custom code, hence the custom Tabs object.
function Tabs() {
    var prefs = new gadgets.Prefs();
    
    this.dayIndex = 0;
    this.eventIndex = 0;
    this.scrollHold = prefs.getInt("scrollHold") * 1000;
    this.scrollResumes = prefs.getInt("scrollResumes") * 1000;
    this.scrollBy = prefs.getString("scrollBy");
}
Tabs.prototype.initTabs = function(daysCount) {
    var i = 0,
	self = this,
	currentDay = Date.today();

    for (; i < daysCount; i++) {
	var $day = $(".day").eq(i);
	var $content = $(".scrollContainer").eq(i);
	
	$day.empty();
	
	if (i == 0) {
	    $day.text("Today");
	}
	else {
	    $day.text(currentDay.toString("dddd"));
	}
	
	if ($day.hasClass("active")) {
	    $content.css("z-index", 5);
	}
	else {
	    $content.hide();
	}

	$day.click(function() {
	    self.stopTimer();
	    clearTimeout(eventWidget.interactivityTimerID);
	    self.showTab($(this).text(), false);
	    
	    eventWidget.interactivityTimerID = setTimeout(function() {
		//Resume auto-scrolling if applicable.
		if (self.scrollBy != "none") {
		    if (self.scrollBy == "row") {
			self.scrollByRow();
		    }
		    else {
			self.scrollByPage();
		    }
		}
	    }, self.scrollResumes);
			    
	    return false;
	});
	
	currentDay.setDate(currentDay.getDate() + 1);
    }
    
    //Remove any tabs that are not needed.
    for (i = 6; i >= daysCount; i--) {
	$(".scrollContainer").eq(i).remove();
	$(".day").eq(i).remove();
    }
}
//Show the selected tab.
Tabs.prototype.showTab = function(day, startTimer) {
    var self = this;
    
    clearTimeout(this.timerID);
    this.eventIndex = 0;
    $(".active").removeClass("active");
    $(".inactive").removeClass("inactive");
    $(".day").each(function (i) {
	var $scrollContainer = $(".scrollContainer").eq(i);
	
	if ($(this).text() == day) {
	    self.dayIndex = i;
	    $(this).addClass("active");
	    $scrollContainer.show().css("z-index", 5);
	}
	else {
	    $(this).addClass("inactive");
	    $scrollContainer.hide().css("z-index", 0);
	}
    });
    
    //Start the timer if selected tab is not "Today".
    if ((this.scrollBy == "none") && ($(".active").text() != "Today")) {
	this.setIdleTimer();
    }

    if ((this.scrollBy != "none") && startTimer) {
	this.startTimer();
    }
}
//Set a timer that will set the Tab back to Today if there is no user interaction after a minute.
Tabs.prototype.setIdleTimer = function() {
    var self = this;
    
    $.idleTimer(60000);
    $(document).bind("idle.idleTimer", function() {
	$.idleTimer("destroy");
	self.showTab("Today", true);	//Go to Today.
	self.dayIndex = 0;
	self.eventIndex = 0;
    });
}
Tabs.prototype.setScrollContainerTop = function() {
    var $lastTab = $(".day:last");
    var top = $lastTab.offset().top + $lastTab.outerHeight(true) + "px";
   
    //Use the height and position of the last tab to calculate the top position of all tabs.
    //The last tab could potentially be below the rest.
    $(".scrollContainer").each(function (i) {
	$(this).css("top", top);
    });
}
//Add an event to the appropriate tab.
Tabs.prototype.addEvent = function(layout, startTime) {
    var $content = null;
    
    $(".day").each(function (i) {
	var day = $(this).text();

	//Get the day for Today.
	if (day == "Today") {
	    day = Date.today().toString("dddd");
	}
	
	if (startTime.getDate().toString("dddd") == day) {
	    $content = $(this).prev().find(".content");
	    $content.append(layout);
	}
    });
    
    return $content;
}
Tabs.prototype.scrollByRow = function() {
    var self = this,
	$events = $(".content").eq(this.dayIndex).find(".event"),
	$lastEvent = $(".content").eq(this.dayIndex).find(".event:last"),
	$content = $(".content").eq(this.dayIndex),
	contentHeight = $content.height(),
	containerHeight = $(".scrollContainer").eq(this.dayIndex).height();

    //Not all events are visible.
    //Issue 729 - Check length of $lastEvent first.
    if (($lastEvent.length > 0) && ($lastEvent.offset().top + $lastEvent.height()) > containerHeight) {	
	$.each($events, function (i, val) {
	    if (i == self.eventIndex) {
		var scrollerTop = $content.css("margin-top"),
		    eventTop = $(this).position().top + $(this).outerHeight(true);
		
		//Set a negative margin for the scroller to scroll events off the top.
		$content.animate({"margin-top": parseInt(scrollerTop) - eventTop + "px"}, "slow", function() {
		    self.startTimer();
		});
	    }
	});
	
	if (this.eventIndex == $events.length - 1) {
	    this.eventIndex = 0;
	    
	    if (this.dayIndex == $(".day").length - 1) {
		this.dayIndex = 0;
	    }
	    else {
		this.dayIndex++;
	    }
	}
	else {
	    this.eventIndex++;
	}
    }
    //Nothing to scroll here. Move to next tab.
    else {
	this.dayIndex = this.dayIndex == $(".day").length - 1 ? 0 : this.dayIndex + 1;
	this.showTab($(".day").eq(this.dayIndex).text(), true);
	$content.css("margin-top", "0px");
    }
}
Tabs.prototype.scrollByPage = function() {
    var	self = this,
	$scrollContainer = $(".scrollContainer:visible"),
	$content = $(".content:visible");
	
    //Not all events are visible. Scroll next page into view.
    if ((parseInt($content.css("margin-top")) + $content.height()) > $scrollContainer.height()) {
	$content.stop().animate({"margin-top": parseInt($content.css("margin-top")) - $scrollContainer.height() + "px"}, 500, function() {
	    self.startTimer();
	});
    }
    //Nothing to scroll here. Move to next tab.
    else {
	$content.stop().animate({"margin-top": "0px"}, 500);
	this.dayIndex = this.dayIndex == $(".day").length - 1 ? 0 : this.dayIndex + 1;
	this.showTab($(".day").eq(this.dayIndex).text(), true);	
    }
}
Tabs.prototype.startTimer = function() {
    var self = this;
    
    this.timerID = setTimeout(function() {
	if (self.scrollBy == "row") {
	    self.scrollByRow();
	}
	else {
	    self.scrollByPage();
	}
    }, this.scrollHold);
}
Tabs.prototype.stopTimer = function() {
    clearTimeout(this.timerID);
}
//Clear existing events.
Tabs.prototype.clear = function() {
    $(".content").each(function (i) {
	$(this).empty();
    }); 
}