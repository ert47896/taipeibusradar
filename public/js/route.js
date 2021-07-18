// Models
let models = {
    // 存放API回復資料
    data: null,
    // 以fetch對API索取資料
    getAPI: function (APIurl) {
        return fetch(APIurl).then((response) => {
            return response.json();
        }).then((result) => {
            this.data = result;
        });
    }
}
// Views
let views = {
    // 圖層變數
    mymap: null,
    // bus icon變數
    busIcon: null,
    // stop icon變數
    stopIcon: null,
    // bus layer
    buslayer: null,
    // stop layer
    stoplayer: null,
    // 記錄公車是否有在地圖上
    busonmap: [],
    // 初始化自訂icons、layer groups
    initMapItems: function () {
        // 公車icon
        let busphoto = L.Icon.extend({
            options: { iconSize: [60, 60] }
        });
        this.busIcon = new busphoto({ iconUrl: "/image/orange72.png" });
        // 車站icon
        let stopphoto = L.Icon.extend({
            options: { iconSize: [20, 20] }
        });
        this.stopIcon = new stopphoto({ iconUrl: "/image/bus_stop.png" });
        // layer groups
        this.buslayer = L.layerGroup().addTo(this.mymap);
        this.stoplayer = L.layerGroup().addTo(this.mymap);
    },
    // 繪製地圖
    renderMap: function (lat, lon) {
        // 設定地圖參數
        this.mymap = L.map("mapId").setView([lat, lon], 12);
        // 套用maps terrain圖層
        L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href=\
            "http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">\
            OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
            maxZoom: 18
        }).addTo(this.mymap);
    },
    // 繪製路線圖
    renderBusLine: function (lineList) {
        // 少數路線交通部未提供路線資料
        if (lineList === "未提供路線資料") {
            // 新增"未提供路線資料"提醒
            const routeTitleDiv = document.querySelector(".routeTitle");
            const nodataSpan = document.createElement("span");
            nodataSpan.textContent = " (未提供路線資料)";
            nodataSpan.classList.add("noRouteData");
            routeTitleDiv.appendChild(nodataSpan);
        } else {
            const routeLine = L.polyline(lineList, { color: "#d36ca7" }).addTo(this.mymap);
        };
    },
    // 標註路線資料
    renderRouteTitle: function (data) {
        // 父層DOM
        const routeTitleDOM = document.querySelector(".routeTitle");
        // 建立路線名稱及資料超連結
        const hyperRouteTitle = document.createElement("a");
        hyperRouteTitle.classList.add("hyperTitle");
        hyperRouteTitle.href = data.routeimgurl;
        hyperRouteTitle.target = "_blank";
        hyperRouteTitle.textContent = data.routename_tw;
        routeTitleDOM.append(hyperRouteTitle);
        // 建立營運業者資料
        const routeSubTitleDOM = document.querySelector(".routeSubTitle");
        // 可能有多個營運業者
        data.operator.forEach((eachOperator) => {
            const spanDOM = document.createElement("span");
            const hyperDOM = document.createElement("a");
            spanDOM.appendChild(hyperDOM);
            hyperDOM.classList.add("hyperTitle");
            hyperDOM.href = eachOperator.webpage;
            hyperDOM.target = "_blank";
            hyperDOM.textContent = eachOperator.oname_tw;
            routeSubTitleDOM.appendChild(spanDOM);
        });
        // 路線去程往 迄點；返程往 起點
        const depdestDOMList = document.querySelectorAll(".depdestTitle");
        const depSpan = document.createElement("div");
        depSpan.textContent = data.destname_tw;
        const destSpan = document.createElement("div");
        destSpan.textContent = data.depname_tw;
        depdestDOMList[0].appendChild(depSpan);
        depdestDOMList[1].appendChild(destSpan);
    },
    // 標註公車位置及服務數量
    renderBus: function (data) {
        let totalBus = 0;
        // 清空地圖公車
        this.buslayer.clearLayers();
        data.forEach((eachBus) => {
            let marker = L.marker([eachBus["latitude"], eachBus["longitude"]], { icon: this.busIcon }).bindTooltip(eachBus["platenumb"], { direction: "top" }).addTo(this.buslayer);
            marker.bindPopup("車牌(Platenumber): " + eachBus["platenumb"] + "<br>" + "目前時速(Speed): " + eachBus["speed"] + " km/hr");
            totalBus += 1;
            // 點擊地圖中心設定為車輛位置
            marker.on("click", () => {
                this.mymap.flyTo(marker.getLatLng(), 15);
            });
            // 將地圖上的公車記錄起來，作為公車在車站位置資料比對(交通部提供公車在車站位置有時會發生該公車於動態資料中查無資訊)
            this.busonmap.push(eachBus["platenumb"]);
        });
        const textDOM = document.querySelector(".totalBusPart");
        textDOM.textContent = totalBus + " 輛公車行駛中";
    },
    // 標註車站序、繪製車站資料與公車在車站位置
    renderStopData: function (data) {
        // 清空地圖站牌序列
        this.stoplayer.clearLayers();
        // 清空車站資料內容
        const articleDOM = document.querySelector(".routeStopAll");
        articleDOM.innerHTML = "";
        for (let index = 0; index < data.length; index++) {
            // 標註車站序
            let marker = L.marker([data[index]["latitude"], data[index]["longitude"]], { icon: this.stopIcon }).bindTooltip((index + 1).toString(), { permanent: true, direction: "top", className: "map-stop-sequence" }).addTo(this.stoplayer);
            marker.bindPopup(data[index]["stopname"] + "<br>" + "地址: " + data[index]["address"]);
            // 點擊地圖中心設定為車站位置
            marker.on("click", () => {
                this.mymap.flyTo(marker.getLatLng(), 15);
            });
            // 填入車站資料與公車在車站位置
            const eachStopDOM = document.createElement("div");
            eachStopDOM.classList.add("eachStopStatus");
            articleDOM.appendChild(eachStopDOM);
            // 車輛到站狀態、車站序列、車站名稱
            const stopstatusDOM = document.createElement("div");
            stopstatusDOM.classList.add("estimateStatus");
            stopstatusDOM.textContent = data[index]["estimatestatus"];
            // 車輛到站狀態如為進站中，背景色改為紅色
            if (data[index]["estimatestatus"] === "進站中") {
                stopstatusDOM.classList.add("busComingsoon");
            };
            eachStopDOM.appendChild(stopstatusDOM);
            const stopsequenceDOM = document.createElement("div");
            stopsequenceDOM.classList.add("stopSequence");
            // 交通部給的路線資料sequence部分有錯誤 (例如路線39去程，23下一站跳25)
            stopsequenceDOM.textContent = index + 1;
            eachStopDOM.appendChild(stopsequenceDOM);
            const stopnameDOM = document.createElement("div");
            stopnameDOM.classList.add("stopName");
            stopnameDOM.textContent = data[index]["stopname"];
            eachStopDOM.appendChild(stopnameDOM);
            // 檢查有無公車在該車站
            const buslocationDOM = document.createElement("div");
            buslocationDOM.classList.add("busLocation");
            eachStopDOM.appendChild(buslocationDOM);
            if (data[index]["platenumb"].length > 0) {
                // 新增車牌資料
                data[index]["platenumb"].forEach((busplatenum) => {
                    // 檢查車牌有沒有出現在地圖上(交通部提供公車在車站位置有時會發生該公車於動態資料中查無資訊)
                    if (this.busonmap.includes(busplatenum)) {
                        const busplatenumbDOM = document.createElement("div");
                        busplatenumbDOM.classList.add("eachBus");
                        busplatenumbDOM.textContent = busplatenum;
                        buslocationDOM.appendChild(busplatenumbDOM);
                    };
                });
            };
        };
    }
}
// Controllers
let controllers = {
    // routeStatus資料更新變數
    renewRouteStatusInterval: null,
    // 起始畫面預設direction=0 顯示去程資料
    initDirection: 0,
    // 初始化
    init: function () {
        views.renderMap(25.046387, 121.516950);
        // 初始化Icons
        views.initMapItems();
        // 讀取routeAPI資料並繪製
        // 以decodeURI()將url子路徑解碼(部分路線非全數字)
        models.getAPI(window.location.origin + "/api" + decodeURI(window.location.pathname)).then(() => {
            views.renderRouteTitle(models.data.data);
            views.renderBusLine(models.data.data.lineLatLon);
        });
        // 讀取routestatus資料並繪製 (direction=0 去程)
        this.showRoutestatusData(this.initDirection);
        // 建立去程 返程按鈕監聽
        this.depreturnButton();
        // 建立15秒更新routestatus資料 (direction=0 去程)
        this.renewRouteStatus(this.initDirection);
    },
    // 讀取此路線routestatus資料(direction=0 去程 direction=1 返程)並繪製，建立15秒更新
    showRoutestatusData: function (direction) {
        // 取得routename
        const urlPathname = (window.location.pathname).split("/");
        const routename = urlPathname[urlPathname.length - 1];
        models.getAPI(window.location.origin + "/api/routestatus/" + decodeURI(routename)).then(() => {
            const dataset = models.data["data"][direction];
            // 繪製公車於地圖位置
            views.renderBus(dataset["OperateBus"]);
            // 繪製車站相關資料與公車在車站位置            
            views.renderStopData(dataset["StopsData"]);
        });
    },
    // 去程點擊 返程點擊監聽
    depreturnButton: function () {
        const buttons = document.querySelectorAll(".depdestTitle");
        const depBtn = buttons[0];
        const returnBtn = buttons[1];
        depBtn.addEventListener("click", () => {
            // 刪除前次建立的15秒更新
            clearInterval(this.renewRouteStatusInterval);
            // 檢查按鈕背景
            if (depBtn.classList.contains("depdestTitle-show") === false) {
                depBtn.classList.add("depdestTitle-show");
                returnBtn.classList.remove("depdestTitle-show");
            };
            // 先建立畫面接續建立15秒更新
            this.showRoutestatusData(0);
            this.renewRouteStatus(0);
        });
        returnBtn.addEventListener("click", () => {
            // 刪除前次建立的15秒更新
            clearInterval(this.renewRouteStatusInterval);
            if (returnBtn.classList.contains("depdestTitle-show") === false) {
                returnBtn.classList.add("depdestTitle-show");
                depBtn.classList.remove("depdestTitle-show");
            };
            this.showRoutestatusData(1);
            this.renewRouteStatus(1);
        });
    },
    renewRouteStatus: function (direction) {
        this.renewRouteStatusInterval = setInterval(() => {
            this.showRoutestatusData(direction);
        }, 15000);
    }
}
controllers.init();     // 載入頁面初始化