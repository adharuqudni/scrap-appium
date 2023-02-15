const wd = require('wd');
const fs = require("fs");
const { parse } = require("csv-parse");
const path = require('path');
const moment = require('moment');
const { scrollAsSizeById, notFoundScroll, scrollPages, extractTextElementByXPath, extractTextElementsById, extractTextElementById } = require('./helper');

const hotel_list = []
const hotel_result = []

const dates = [1, 7, 14].map(val => {
    const today = moment();
    const checkIn = moment().add(val, 'days').format('D MMMM YYYY');
    const checkOut = moment().add((val + 1), 'days').format('D MMMM YYYY');

    return { checkIn, checkOut };
});

const filterSectionV1 = async (driver, city, name) => {
    // search hotel
    const searchFieldButton = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.widget.ScrollView/android.widget.TextView[4]");
    await searchFieldButton.click();
    const searchField = await driver.elementById("com.agoda.mobile.consumer:id/textbox_textsearch_searchbox");
    await searchField.sendKeys(name);
    await driver.sleep(3000)
    const firstCityAppear = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/androidx.recyclerview.widget.RecyclerView/android.widget.LinearLayout[1]");
    await firstCityAppear.click();

    // filter date
    const dateFieldButton = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.widget.ScrollView/android.view.View[3]");
    await dateFieldButton.click();
    const checkInButton = await driver.elementByAccessibilityId(dates[0].checkIn);
    await checkInButton.click();
    const checkOutButton = await driver.elementByAccessibilityId(dates[0].checkOut);
    await checkOutButton.click();
    await driver.waitForElementById("com.agoda.mobile.consumer:id/button_datepicker_done")
    const submitDateButton = await driver.elementById("com.agoda.mobile.consumer:id/button_datepicker_done");
    await submitDateButton.click();

    const searchButton = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.widget.ScrollView/android.view.View[6]/android.widget.Button");
    await searchButton.click();

    await driver.setImplicitWaitTimeout(10000);

    try {
        const listCard = await driver.elementsByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.view.ViewGroup/android.widget.FrameLayout/android.widget.RelativeLayout/androidx.recyclerview.widget.RecyclerView/androidx.compose.ui.platform.ComposeView");
        let hotelCard = null
        for (const element of listCard) {
            const size = await element.getSize();
            if (size.height > 300) {
                await element.click()
                hotelCard = element
                break
            }
        }
        if (hotelCard == null) {
            throw new Error('null')
        }

    } catch (e) {
        const backButton = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.view.ViewGroup/android.widget.LinearLayout[1]/android.widget.LinearLayout/android.widget.LinearLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View[1]/android.view.View[3]/android.widget.TextView[3]");
        await backButton.click();
        hotel_result.push({ hotelName, error: 'Hotel not found' })
        throw new Error("Hotel Not Found")
    }

    await driver.setImplicitWaitTimeout(5000);


    await driver.waitForElementById('com.agoda.mobile.consumer:id/hotel_detail_view')

    const detailScroll = await scrollPages(driver, 1500, -1400)

    const address = await extractTextElementByXPath(driver, '/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.RelativeLayout/android.widget.FrameLayout/android.widget.FrameLayout/androidx.recyclerview.widget.RecyclerView/android.widget.FrameLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.widget.TextView[6]', 'address')
    const hotelName = await extractTextElementByXPath(driver, '/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.RelativeLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View/android.widget.TextView[1]', 'hotelName')
    console.log(address, hotelName)

    try {
        let selectRoomButton = await driver.elementById("com.agoda.mobile.consumer:id/selectRoomButton");
        await selectRoomButton.click();

    } catch (e) {
        console.log(e)
        let backButton2 = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.RelativeLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View/android.view.View[1]");
        await backButton2.click();
        let backButton3 = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.view.ViewGroup/android.widget.LinearLayout[1]/android.widget.LinearLayout/android.widget.LinearLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View[1]/android.view.View[1]");
        await backButton3.click();
        hotel_result.push({ hotelName, error: 'Hotel Sold Out' })
        throw new Error("Hotel Sold Out")
    }

    await driver.waitForElementById('com.agoda.mobile.consumer:id/room_group_container')


    const scrollDownRoom = await scrollPages(driver, 900, -900)

    await notFoundScroll(driver, async () => {
        let roomDetailsButton = await driver.elementByXPath('//*[@content-desc="Room details"]');
        await roomDetailsButton.click();
    })
    await driver.setImplicitWaitTimeout(2000);

    const dealsRoomType = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_room_roomname', 'dealsRoomType')
    const dealsAvailableRoom = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/room_gallery_urgency_message', 'dealsAvailableRoom')
    const scrollDownDetails = await scrollPages(driver, 900, -800)

    const dealsShownPrice = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_price', 'dealsShownPrice')
    const dealsBedType = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_bed_size', 'dealsBedType')
    const dealsMaxOccupancy = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_max_occupancy', 'dealsMaxOccupancy')
    const dealsTotalPrice = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_price_crossout', 'dealsTotalPrice')
    const dealsAmenities = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/badge_view_text', 'dealsAmenities')
    await scrollDownDetails.perform();

    const dealsRoomDetails = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/label_room_hotelinfo_detail', 'dealsRoomDetails')
    await scrollDownDetails.perform();

    const dealsPolicy = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/panel_hotel_info_detail', 'dealsPolicy')
    await driver.setImplicitWaitTimeout(5000);

    hotel_result.push({
        source: 'native',
        avalaibility: 'Available',
        provider: 'agoda',
        hotelName,
        address,
        currency: 'IDR',
        hotelCity: city,
        checkIn: dates[0].checkIn,
        checkOut: dates[0].checkOut,
        dealsRoomType,
        dealsAmenities,
        dealsAvailableRoom,
        dealsPolicy,
        dealsBedType,
        dealsRoomDetails,
        dealsMaxOccupancy,
        dealsShownPrice,
        dealsTotalPrice,
        processed_timestamp: moment(),
    })

    const backButton = await driver.elementById("com.agoda.mobile.consumer:id/image_view_back_button_icon");
    await backButton.click();


    for (const [index, date] of dates.slice(1, 3).entries()) {
        console.log(date)
        console.log(moment().format('HH:mm:ss Dates'))

        const scrollUpRoom = await scrollPages(driver, 500, 1300)
        await scrollUpRoom.perform();

        const checkin = await driver.elementById("com.agoda.mobile.consumer:id/layout_check_in");
        await checkin.click();

        let dateCheckin = await driver.elementByAccessibilityId(date.checkIn);
        await dateCheckin.click();
        let dateCheckout = await driver.elementByAccessibilityId(date.checkOut);
        await dateCheckout.click();

        let submitDate = await driver.elementById("com.agoda.mobile.consumer:id/button_datepicker_done");
        await submitDate.click();

        const scrollDownRoom = await scrollPages(driver, 900, -800)

        try {
            let changeDate = await driver.elementById("com.agoda.mobile.consumer:id/property_sold_out_change_date_button");
            console.log('hotelSold by date')
            if (index == 1) {
                throw new Error('hotel Sold by date')
            }
            hotel_result.push({ hotelName, error: 'Hotel Room Sold Out', checkin: date.checkIn, checkoutDate: date.checkOut })
            continue;
        } catch (e) {

            await notFoundScroll(driver, async () => {
                let el15 = await driver.elementByXPath('//*[@content-desc="Room details"]');
                await el15.click();
            })
        }

        await driver.setImplicitWaitTimeout(2000);

        const dealsRoomType = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_room_roomname', 'dealsRoomType')
        const dealsAvailableRoom = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/room_gallery_urgency_message', 'dealsAvailableRoom')
        const scrollDownDetails = await scrollPages(driver, 900, -800)

        const dealsShownPrice = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_price', 'dealsShownPrice')
        const dealsBedType = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_bed_size', 'dealsBedType')
        const dealsMaxOccupancy = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_max_occupancy', 'dealsMaxOccupancy')
        const dealsTotalPrice = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_price_crossout', 'dealsTotalPrice')
        const dealsAmenities = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/badge_view_text', 'dealsAmenities')
        await scrollDownDetails.perform();

        const dealsRoomDetails = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/label_room_hotelinfo_detail', 'dealsRoomDetails')
        await scrollDownDetails.perform();

        const dealsPolicy = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/panel_hotel_info_detail', 'dealsPolicy')
        await driver.setImplicitWaitTimeout(5000);

        hotel_result.push({
            source: 'native',
            avalaibility: 'Available',
            provider: 'agoda',
            hotelName,
            address,
            currency: 'IDR',
            hotelCity: city,
            checkIn: date.checkIn,
            checkOut: date.checkOut,
            dealsRoomType,
            dealsAmenities,
            dealsAvailableRoom,
            dealsPolicy,
            dealsBedType,
            dealsRoomDetails,
            dealsMaxOccupancy,
            dealsShownPrice,
            dealsTotalPrice,
            processed_timestamp: moment(),
        })

        const backButton = await driver.elementById("com.agoda.mobile.consumer:id/image_view_back_button_icon");
        await backButton.click();
    }
    await driver.waitForElementById('com.agoda.mobile.consumer:id/room_group_container')
    let backButton1 = await driver.elementByAccessibilityId("Image description (no need to translate this text)");
    await backButton1.click();
    let backButton2 = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.RelativeLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View/android.view.View[1]");
    await backButton2.click();
    let backButton3 = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.view.ViewGroup/android.widget.LinearLayout[1]/android.widget.LinearLayout/android.widget.LinearLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View[1]/android.view.View[1]");
    await backButton3.click();
}
console.log(notFoundScroll);
const filterSection = async (driver, city, name) => {
    // search hotel
    const searchFieldButton = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.widget.ScrollView/android.widget.TextView[4]");
    await searchFieldButton.click();
    const searchField = await driver.elementById("com.agoda.mobile.consumer:id/textbox_textsearch_searchbox");
    await searchField.sendKeys(name);
    await driver.sleep(3000)
    const firstCityAppear = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/androidx.recyclerview.widget.RecyclerView/android.widget.LinearLayout[1]");
    await firstCityAppear.click();

    // filter date
    const dateFieldButton = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.widget.ScrollView/android.view.View[3]");
    await dateFieldButton.click();
    const checkInButton = await driver.elementByAccessibilityId(dates[0].checkIn);
    await checkInButton.click();
    const checkOutButton = await driver.elementByAccessibilityId(dates[0].checkOut);
    await checkOutButton.click();
    await driver.waitForElementById("com.agoda.mobile.consumer:id/button_datepicker_done")
    const submitDateButton = await driver.elementById("com.agoda.mobile.consumer:id/button_datepicker_done");
    await submitDateButton.click();

    const searchButton = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.widget.ScrollView/android.view.View[6]/android.widget.Button");
    await searchButton.click();

    await driver.setImplicitWaitTimeout(10000);

    try {
        const listCard = await driver.elementsByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.view.ViewGroup/android.widget.FrameLayout/android.widget.RelativeLayout/androidx.recyclerview.widget.RecyclerView/androidx.compose.ui.platform.ComposeView");
        let hotelCard = null
        for (const element of listCard) {
            const size = await element.getSize();
            if (size.height > 300) {
                await element.click()
                hotelCard = element
                break
            }
        }
        if (hotelCard == null) {
            throw new Error('null')
        }

    } catch (e) {
        const backButton = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.view.ViewGroup/android.widget.LinearLayout[1]/android.widget.LinearLayout/android.widget.LinearLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View[1]/android.view.View[3]/android.widget.TextView[3]");
        await backButton.click();
        hotel_result.push({ hotelName, error: 'Hotel not found' })
        throw new Error("Hotel Not Found")
    }

    await driver.setImplicitWaitTimeout(5000);


    await driver.waitForElementById('com.agoda.mobile.consumer:id/hotel_detail_view')

    const detailScroll = await scrollPages(driver, 1500, -1400)

    // let detailGroup = await driver.elementById('com.agoda.mobile.consumer:id/hotel_detail_view');
    // const address = await detailGroup.elementByXPath('.//android.widget.TextView[@index="18"]').text();
    const hotelName = await extractTextElementByXPath(driver, '/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.RelativeLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View/android.widget.TextView[1]', 'hotelName')
    // console.log(address, hotelName)

    try {
        let selectRoomButton = await driver.elementById("com.agoda.mobile.consumer:id/selectRoomButton");
        await selectRoomButton.click();

    } catch (e) {
        console.log(e)
        let backButton2 = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.RelativeLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View/android.view.View[1]");
        await backButton2.click();
        let backButton3 = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.view.ViewGroup/android.widget.LinearLayout[1]/android.widget.LinearLayout/android.widget.LinearLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View[1]/android.view.View[1]");
        await backButton3.click();
        hotel_result.push({ hotelName, error: 'Hotel Sold Out' })
        throw new Error("Hotel Sold Out")
    }

    await driver.waitForElementById('com.agoda.mobile.consumer:id/room_group_container')


    const room_list = []
    const current_room = {
        name: '-1'
    }

    while (true) {
        let roomsGroup = await driver.elementById('com.agoda.mobile.consumer:id/layout_room_expanded_header_root');
        let roomName = await roomsGroup.elementByXPath('.//android.widget.LinearLayout/android.widget.LinearLayout/android.widget.LinearLayout[2]/android.widget.LinearLayout[1]/android.widget.TextView').text();
        let roomDetailsGroup = await roomsGroup.elementByXPath('.//android.widget.LinearLayout/android.widget.LinearLayout/android.widget.LinearLayout[2]/android.widget.RelativeLayout');
        let roomDetails = await roomDetailsGroup.elementsByXPath('.//*[@class="android.widget.TextView"]');
        const listDetails = []
        for await (const details of roomDetails) {
            const text = await details.text()
            listDetails.push(text)
        }
        let LinearLayout = await roomsGroup.elementsByXPath('.//android.widget.LinearLayout/android.widget.LinearLayout/android.widget.LinearLayout[2]/android.widget.LinearLayout');
        let roomAmenitiesGroup = await LinearLayout[LinearLayout.length - 2];
        let roomAmenities = await roomAmenitiesGroup.elementsByXPath('.//*[@class="android.widget.TextView"]');
        const listAmenities = []
        for await (const amenties of roomAmenities) {
            const text = await amenties.text()
            listAmenities.push(text)
        }

        await scrollAsSizeById(driver, 'com.agoda.mobile.consumer:id/layout_room_expanded_header_root')
        console.log(roomName, listDetails, listAmenities)


        //get all prices
        while (true) {
            await notFoundScroll(driver, async () => {
                const buttonBook = await driver.elementById("com.agoda.mobile.consumer:id/button_hotel_room_bookit");
            }, 1300, -1100)
            const totalPrice = await extractTextElementById(driver, "com.agoda.mobile.consumer:id/price_cross_out_rate")
            const pseudoPrice = await extractTextElementById(driver, "com.agoda.mobile.consumer:id/price_info_pseudo_coupon")
            const shownPrice = await extractTextElementById(driver, "com.agoda.mobile.consumer:id/price_info")
            const cancellationPolicy = await extractTextElementById(driver, "com.agoda.mobile.consumer:id/label_hotel_panel_info_title")
            console.log(totalPrice, pseudoPrice, shownPrice, cancellationPolicy)
            try {
                const nextRoom = await driver.elementById("com.agoda.mobile.consumer:id/collapsed_head_container");
                console.log('room was end')
                break
            } catch (e) {
                console.log('room still exist')
            }


        }

    }

    await driver.setImplicitWaitTimeout(2000);

    const dealsRoomType = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_room_roomname', 'dealsRoomType')
    const dealsAvailableRoom = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/room_gallery_urgency_message', 'dealsAvailableRoom')
    const scrollDownDetails = await scrollPages(driver, 900, -800)

    const dealsShownPrice = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_price', 'dealsShownPrice')
    const dealsBedType = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_bed_size', 'dealsBedType')
    const dealsMaxOccupancy = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_max_occupancy', 'dealsMaxOccupancy')
    const dealsTotalPrice = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_price_crossout', 'dealsTotalPrice')
    const dealsAmenities = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/badge_view_text', 'dealsAmenities')
    await scrollDownDetails.perform();

    const dealsRoomDetails = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/label_room_hotelinfo_detail', 'dealsRoomDetails')
    await scrollDownDetails.perform();

    const dealsPolicy = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/panel_hotel_info_detail', 'dealsPolicy')
    await driver.setImplicitWaitTimeout(5000);

    hotel_result.push({
        source: 'native',
        avalaibility: 'Available',
        provider: 'agoda',
        hotelName,
        address,
        currency: 'IDR',
        hotelCity: city,
        checkIn: dates[0].checkIn,
        checkOut: dates[0].checkOut,
        dealsRoomType,
        dealsAmenities,
        dealsAvailableRoom,
        dealsPolicy,
        dealsBedType,
        dealsRoomDetails,
        dealsMaxOccupancy,
        dealsShownPrice,
        dealsTotalPrice,
        processed_timestamp: moment(),
    })

    const backButton = await driver.elementById("com.agoda.mobile.consumer:id/image_view_back_button_icon");
    await backButton.click();


    for (const [index, date] of dates.slice(1, 3).entries()) {
        console.log(date)
        console.log(moment().format('HH:mm:ss Dates'))

        const scrollUpRoom = await scrollPages(driver, 500, 1300)
        await scrollUpRoom.perform();

        const checkin = await driver.elementById("com.agoda.mobile.consumer:id/layout_check_in");
        await checkin.click();

        let dateCheckin = await driver.elementByAccessibilityId(date.checkIn);
        await dateCheckin.click();
        let dateCheckout = await driver.elementByAccessibilityId(date.checkOut);
        await dateCheckout.click();

        let submitDate = await driver.elementById("com.agoda.mobile.consumer:id/button_datepicker_done");
        await submitDate.click();

        const scrollDownRoom = await scrollPages(driver, 900, -800)

        try {
            let changeDate = await driver.elementById("com.agoda.mobile.consumer:id/property_sold_out_change_date_button");
            console.log('hotelSold by date')
            if (index == 1) {
                throw new Error('hotel Sold by date')
            }
            hotel_result.push({ hotelName, error: 'Hotel Room Sold Out', checkin: date.checkIn, checkoutDate: date.checkOut })
            continue;
        } catch (e) {

            await notFoundScroll(driver, async () => {
                let el15 = await driver.elementByXPath('//*[@content-desc="Room details"]');
                await el15.click();
            })
        }

        await driver.setImplicitWaitTimeout(2000);

        const dealsRoomType = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_room_roomname', 'dealsRoomType')
        const dealsAvailableRoom = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/room_gallery_urgency_message', 'dealsAvailableRoom')
        const scrollDownDetails = await scrollPages(driver, 900, -800)

        const dealsShownPrice = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_price', 'dealsShownPrice')
        const dealsBedType = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_bed_size', 'dealsBedType')
        const dealsMaxOccupancy = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_max_occupancy', 'dealsMaxOccupancy')
        const dealsTotalPrice = await extractTextElementById(driver, 'com.agoda.mobile.consumer:id/label_hotel_room_price_crossout', 'dealsTotalPrice')
        const dealsAmenities = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/badge_view_text', 'dealsAmenities')
        await scrollDownDetails.perform();

        const dealsRoomDetails = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/label_room_hotelinfo_detail', 'dealsRoomDetails')
        await scrollDownDetails.perform();

        const dealsPolicy = await extractTextElementsById(driver, 'com.agoda.mobile.consumer:id/panel_hotel_info_detail', 'dealsPolicy')
        await driver.setImplicitWaitTimeout(5000);

        hotel_result.push({
            source: 'native',
            avalaibility: 'Available',
            provider: 'agoda',
            hotelName,
            address,
            currency: 'IDR',
            hotelCity: city,
            checkIn: date.checkIn,
            checkOut: date.checkOut,
            dealsRoomType,
            dealsAmenities,
            dealsAvailableRoom,
            dealsPolicy,
            dealsBedType,
            dealsRoomDetails,
            dealsMaxOccupancy,
            dealsShownPrice,
            dealsTotalPrice,
            processed_timestamp: moment(),
        })

        const backButton = await driver.elementById("com.agoda.mobile.consumer:id/image_view_back_button_icon");
        await backButton.click();
    }
    await driver.waitForElementById('com.agoda.mobile.consumer:id/room_group_container')
    let backButton1 = await driver.elementByAccessibilityId("Image description (no need to translate this text)");
    await backButton1.click();
    let backButton2 = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.RelativeLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View/android.view.View[1]");
    await backButton2.click();
    let backButton3 = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.view.ViewGroup/android.widget.LinearLayout[1]/android.widget.LinearLayout/android.widget.LinearLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View[1]/android.view.View[1]");
    await backButton3.click();
}


const startFunction = async () => {
    const driver = wd.promiseChainRemote({
        host: '0.0.0.0',
        port: 4723
    })
    const desiredCaps = {
        platformName: 'Android',
        platformVersion: '10',
        deviceName: 'Android Emulator',
        app: './agoda.apk',
        showGradleLog: true,
        forceEspressoRebuild: true,
        noReset: true,
    };
    driver.init(desiredCaps).then(() => {
        fs.createReadStream("./hotel_list.csv")
            .pipe(parse({ delimiter: ",", from_line: 2 }))
            .on("data", function (row) {
                const data = {
                    name: row[2],
                    city: row[3],
                }
                hotel_list.push(data)
            })
            .on("end", async function () {
                console.log(hotel_list)
                const asserters = wd.asserters;
                await driver.setImplicitWaitTimeout(5000);

                await driver.waitForElementById('com.agoda.mobile.consumer:id/alert_message_buttons', asserters.isDisplayed, 10000, 100)
                const skipButton = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.LinearLayout/android.widget.Button[1]");
                await skipButton.click();
                const hotelCard = await driver.elementByXPath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/androidx.compose.ui.platform.ComposeView/android.view.View/android.view.View/android.view.View/android.widget.ScrollView/android.view.View[2]/android.view.View/android.view.View/android.view.View[1]/android.view.View/android.view.View");
                await hotelCard.click();
                for (hotel of hotel_list) {
                    console.log(hotel)
                    console.log(moment().format('HH:mm:ss Hotels'))
                    try {
                        await filterSection(driver, hotel.city, hotel.name)
                        console.log('Panjang Hotel', hotel_result.length)
                        fs.writeFileSync('./data.json', JSON.stringify(hotel_result), 'utf8');
                    } catch (e) {
                        console.info(e)
                    }
                }

                console.log(hotel_result)
            })
            .on("error", function (error) {
                console.log(error.message);
            });
    });


}

startFunction()
