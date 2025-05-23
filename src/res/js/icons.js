import { ApplyTextLocation, GetPropByStringPath, DeepClone, ComputeNodeValue } from './common.js'

export function RenderIcons(container, doc, dataBag) {
    let iconsContainer = container.append("g")
        .attr("class", "icons");

    dataBag.icons = {};

    let previous = {};
    Object.keys(doc.icons).forEach(function (key, index) {

        let computed = {};

        doc.icons[key].x = ComputeNodeValue(doc.icons[key], key, "x", previous, doc, key);
        doc.icons[key].y = ComputeNodeValue(doc.icons[key], key, "y", previous, doc, key);

        computed.xScaled = dataBag.Scaler.X.ScaleWithOffset(doc.icons[key].x)
        computed.yScaled = dataBag.Scaler.Y.ScaleWithOffset(doc.icons[key].y);

        computed.scaledMargin = {
            top: doc.icons[key].margin.top * dataBag.Scaler.Y.UnitStepAbs,
            right: doc.icons[key].margin.right * dataBag.Scaler.X.UnitStepAbs,
            bottom: doc.icons[key].margin.bottom * dataBag.Scaler.Y.UnitStepAbs,
            left: doc.icons[key].margin.left * dataBag.Scaler.X.UnitStepAbs
        }

        computed.scaledPadding = {
            top: doc.icons[key].padding.top * dataBag.Scaler.Y.UnitStepAbs,
            right: doc.icons[key].padding.right * dataBag.Scaler.X.UnitStepAbs,
            bottom: doc.icons[key].padding.bottom * dataBag.Scaler.Y.UnitStepAbs,
            left: doc.icons[key].padding.left * dataBag.Scaler.X.UnitStepAbs
        }

        computed.wScaled = doc.icons[key].w * dataBag.Scaler.X.UnitStepAbs;
        computed.hScaled = doc.icons[key].h * dataBag.Scaler.Y.UnitStepAbs;

        computed.x1 = computed.wScaled / 2 * -1;
        computed.y1 = computed.hScaled / 2 * -1;

        computed.x2 = computed.wScaled / 2;
        computed.y2 = computed.hScaled / 2;

        computed.x1Marged = computed.x1 + computed.scaledMargin.left;
        computed.y1Marged = computed.y1 + computed.scaledMargin.top;

        computed.x2Marged = computed.x2 - computed.scaledMargin.right;
        computed.y2Marged = computed.y2 - computed.scaledMargin.bottom;

        computed.x1Padded = computed.x1Marged + computed.scaledPadding.left;
        computed.y1Padded = computed.y1Marged + computed.scaledPadding.top;

        computed.x2Padded = computed.x2Marged - computed.scaledPadding.right;
        computed.y2Padded = computed.y2Marged - computed.scaledPadding.bottom;

        computed.wMarged = computed.wScaled - computed.scaledMargin.left - computed.scaledMargin.right;
        computed.hMarged = computed.hScaled - computed.scaledMargin.top - computed.scaledMargin.bottom;

        computed.wPadded = computed.wMarged - computed.scaledPadding.left - computed.scaledPadding.right;
        computed.hPadded = computed.hMarged - computed.scaledPadding.top - computed.scaledPadding.bottom;

        computed.cornerRad = Math.min(dataBag.Scaler.X.UnitStepAbs, dataBag.Scaler.Y.UnitStepAbs) * (1 / 16);

        let iconContainer = iconsContainer.append("g")
            .attr("id", "icon-" + key)
            .attr("transform", `translate(${computed.xScaled}, ${computed.yScaled})`);

        iconContainer.append("rect")
            .attr("x", computed.x1Marged)
            .attr("y", computed.y1Marged)
            .attr("width", computed.wMarged)
            .attr("height", computed.hMarged)
            .attr("rx", computed.cornerRad)
            .attr("ry", computed.cornerRad)
            .attr("fill", doc.icons[key].fill)
            .attr("stroke", doc.icons[key].stroke);

        // Text

        let fontSize = doc.icons[key].textSizeRatio * Math.min(dataBag.Scaler.X.UnitStepAbs, dataBag.Scaler.Y.UnitStepAbs)

        let iconText = iconContainer.append("text")
            .attr("class", "icon-label")
            .attr("fill", doc.icons[key].color)
            .style("font-size", `${fontSize}px`);

        let textContent = key;
        if ("text" in doc.icons[key]) {
            textContent = doc.icons[key].text;
        }

        if (!("url" in doc.icons[key])) {
            iconText.text(textContent);
        }
        else {
            iconText.append("a")
                .attr("xlink:href", doc.icons[key].url)
                .attr("target", "_blank")
                .attr("class", "link")
                .text(textContent);
        }

        if ("metadata" in doc.icons[key]) {
            iconContainer.attr("class", iconContainer.attr("class") + " metadata")

            let tooltip = null;

            iconContainer.on("mouseenter mousemove", async function (event) {
                event.preventDefault();

                if (tooltip != null) {
                    return;
                }

                tooltip = "lock"

                let metadataBag = DeepClone(doc.icons[key].metadata);

                delete metadataBag.url;
                delete metadataBag.errorText;

                if ("url" in doc.icons[key].metadata) {
                    let url = doc.icons[key].metadata.url;

                    let matcher = /{{\s*(\S*)\s*}}/gm

                    let result;
                    while (result = matcher.exec(url)) {
                        let matchKey = result[1];

                        if (matchKey == "key") {
                            url = url.replace(result[0], key);
                        }
                        else {
                            url = url.replace(result[0], GetPropByStringPath(doc.icons[key], matchKey));
                        }
                    }

                    try {
                        let fetchRes = await fetch(url);

                        if (!fetchRes.ok) {
                            if ("errorText" in doc.icons[key].metadata) {
                                metadataBag.Error = doc.icons[key].metadata.errorText;
                            }
                            else {
                                metadataBag.Error = `${fetchRes.status} ${fetchRes.statusText}`;
                            }
                        }
                        else {
                            let json = await fetchRes.json();

                            for (let key in json) {
                                metadataBag[key] = json[key];
                            }
                        }
                    }
                    catch (err) {
                        if ("errorText" in doc.icons[key].metadata) {
                            metadataBag.Error = doc.icons[key].metadata.errorText;
                        }
                        else {
                            metadataBag.Error = "Error while querying metadata. Check URL/service availability."
                        }
                    }
                }

                if (tooltip === "destroy") {
                    tooltip = null;
                    return;
                }

                let metatable = document.createElement("table");
                metatable.classList.add("table", "table-sm", "table-borderless", "table-dark", "mb-0", "metadata-table", "table-striped");
                let tbody = document.createElement("tbody");
                metatable.appendChild(tbody);

                for (let metaKey in metadataBag) {
                    let tr = document.createElement("tr");
                    let td1 = document.createElement("th");
                    let td2 = document.createElement("td");

                    td1.innerText = metaKey;
                    td2.innerText = metadataBag[metaKey];

                    tr.appendChild(td1);
                    tr.appendChild(td2);

                    tbody.appendChild(tr);
                }

                let tooltipContent = metatable.outerHTML;

                tooltip = new bootstrap.Tooltip(event.target, {
                    html: true,
                    sanitize: false,
                    container: "body",
                    trigger: "manual",
                    title: tooltipContent
                })


                tooltip.show();
            });

            iconContainer.on("mouseleave", function (event) {
                event.preventDefault();
                if (tooltip === null || tooltip === "destroy") {
                    return;
                }

                if (tooltip === "lock") {
                    tooltip = "destroy";
                    return;
                }

                tooltip.dispose();
                tooltip = null;
            });
        }


        // Text location

        ApplyTextLocation(iconText, doc.icons[key].textLocation, computed.x1Padded, computed.y1Padded, computed.x2Padded, computed.y2Padded)

        computed.iconImageXOffset = 0;
        computed.iconImageYOffset = 0;

        if (doc.icons[key].textLocation.startsWith("top")) {
            computed.iconImageYOffset = fontSize * 1.2;
        }
        else if (doc.icons[key].textLocation.startsWith("bottom")) {
            computed.iconImageYOffset = fontSize * 1.2 * -1;
        }
        else if (doc.icons[key].textLocation.startsWith("left")) {
            computed.iconImageXOffset = fontSize * 1.2;
        }
        else if (doc.icons[key].textLocation.startsWith("right")) {
            computed.iconImageXOffset = fontSize * 1.2 * -1;
        }

        // Icon
        let iconSize = Math.min(computed.wPadded - Math.abs(computed.iconImageXOffset), computed.hPadded - Math.abs(computed.iconImageYOffset));


        if (doc.icons[key].iconFamily != null && doc.icons[key].iconFamily != "none" && doc.icons[key].icon != null && doc.icons[key].icon != "none") {
            let family = doc.icons[key].iconFamily.toLowerCase();
            let icon = doc.icons[key].icon.toLowerCase();
            let url = "./res/icons/" + family + "/" + icon + ".svg";

            if (family == "iconify") {
                url = `https://api.iconify.design/${icon.replace(":", "/")}.svg`;
            }

            let iconImage = iconContainer.append("g")
                .attr("transform", `translate(${iconSize / 2 * -1 + computed.iconImageXOffset / 2}, ${iconSize / 2 * -1 + computed.iconImageYOffset / 2})`);

            fetch(url).then(function (raw) {
                let svg = raw.text().then(text => {
                    let parser = new DOMParser();
                    let svg = parser.parseFromString(text, "image/svg+xml").documentElement;

                    svg.setAttribute("width", iconSize);
                    svg.setAttribute("height", iconSize);

                    let scripts = svg.querySelectorAll("script");
                    if (scripts != null && scripts.length > 0) {
                        scripts.forEach(script => {
                            script.remove();
                        });
                    }

                    let preserveWhite = "preserveWhite" in doc.icons[key] ? doc.icons[key].preserveWhite : false;

                    if ("iconFill" in doc.icons[key]) {
                        let fills = svg.querySelectorAll("[fill]");
                        if (fills != null && fills.length > 0) {
                            fills.forEach(fill => {
                                let fillAttr = fill.getAttribute("fill");
                                if (!preserveWhite) {
                                    fill.setAttribute("fill", doc.icons[key].iconFill);
                                }
                                else {
                                    if (!(fillAttr == "#fff" || fillAttr == "#ffffff" || fillAttr == "white"))
                                        fill.setAttribute("fill", doc.icons[key].iconFill);
                                }
                            });
                        }
                    }

                    if ("iconStroke" in doc.icons[key]) {
                        let strokes = svg.querySelectorAll("[stroke]");
                        if (strokes != null && strokes.length > 0) {
                            strokes.forEach(stroke => {
                                let strokeAttr = stroke.getAttribute("stroke");
                                if (!preserveWhite) {
                                    stroke.setAttribute("stroke", doc.icons[key].iconStroke);
                                }
                                else {
                                    if (!(strokeAttr == "#fff" || strokeAttr == "#ffffff" || strokeAttr == "white"))
                                        stroke.setAttribute("stroke", doc.icons[key].iconStroke);
                                }
                            });
                        }
                    }

                    iconImage._groups[0][0].innerHTML = svg.outerHTML;
                });
            });
        }

        dataBag.icons[key] = computed;
        previous = doc.icons[key];
    });

}