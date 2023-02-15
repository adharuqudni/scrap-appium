const wd = require('wd');


const retringEvent = async (driver, callback) => {
    try{
        await callback()
    }catch{
        console.log('Event Error, trying to retry...')
        await driver.back();
        await retringEvent(driver, callback)
    }
}

const scrollPages = async (driver, start, end) => {
    const actions = new wd.W3CActions(driver);
    try{
        const touchInput = await actions.addTouchInput();
        await touchInput.pointerMove({ duration: 0, x: 10, y: start });
        await touchInput.pointerDown({ button: 0 });
        await touchInput.pause({ duration: 300 });
        await touchInput.pointerMove({ duration: 400, origin: 'pointer', x: 0, y: end });
        await touchInput.pointerUp({ button: 0 });
        await actions.perform(); 
    }catch(e){
        console.log('Scroll Error')
        scrollPages(driver, start, end);
    }

    return actions
}

const notFoundScroll = async (driver, callback, startPoint = 900, endPoint = -500) => {
    try{
        await callback()
    }catch(e){
        // console.log(e)
        await scrollPages(driver, startPoint, endPoint);
        await notFoundScroll(driver, callback);
    }
}

const scrollAsSizeById = async (driver, id) => {
    try{
        const element = await driver.elementById(id)
        const size = await element.getSize();
        await scrollPages(driver, 1700, (-(1700-size.height)));

    }catch(e){
        console.log(e)
        console.log('error scroll size')
    }
}

const extractTextElementById = async (driver, id, propertieName) => {
    let text = 'null'
    let oneTry = true
    try {
        text = await driver.elementById(id).text()
    } catch (e) {
        if(oneTry) {
            scrollPages(driver, 900, -300);
            oneTry = false
        }
        console.info(`${propertieName} not found (null)`)
    }

    return text
}

const extractTextElementsById = async (driver, id) => {
    const elementsGroup = await driver.elementsById(id)
    const arrayText = []
    elementsGroup.forEach(async element => {
        const text = await element.text()
        arrayText.push(text)
    })

    return arrayText
}

const extractTextElementByXPath = async (driver, xpath) => {
    let text = 'null'
    try {
        text = await driver.elementByXPath(xpath).text()
    } catch (e) {
        console.info(e)
    }

    return text
}

const extractTextElementsByXPath = async (driver, xpath) => {
    const elementsGroup = await driver.elementsByXPath(xpath)
    const arrayText = []
    elementsGroup.forEach(async element => {
        const text = await element.text()
        arrayText.push(text)
    })

    return arrayText
}


module.exports = {
    notFoundScroll,
    retringEvent,
    scrollPages,
    extractTextElementById,
    extractTextElementsById,
    extractTextElementByXPath,
    scrollAsSizeById
}