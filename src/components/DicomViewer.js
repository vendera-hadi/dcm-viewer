import { useEffect, useRef, useState } from "react";
import { ZoomIn, Highlights, Dpad, Rulers, Circle } from "react-bootstrap-icons";
import Hammer from "hammerjs";
import * as cornerstone from "cornerstone-core";
import * as cornerstoneTools from "cornerstone-tools";
import * as cornerstoneMath from "cornerstone-math";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import * as dicomParser from "dicom-parser";
import { TAG_DICT } from "./DataDictionary";

initCornerstone()

function DicomViewer({ imageId }) {
    const [tools, setTools] = useState({
      "ZoomMouseWheel": false,
      "Wwwc": false,
      "Pan": false,
      "Length": false,
      "EllipticalRoi": false,
    });
    const imageUrl = "wadouri:" + imageId
    const dicomImageRef = useRef()
    const ZoomMouseWheelTool = cornerstoneTools.ZoomMouseWheelTool
    const WwwcTool = cornerstoneTools.WwwcTool
    const PanTool = cornerstoneTools.PanTool
    const LengthTool = cornerstoneTools.LengthTool
    const EllipticalTool = cornerstoneTools.EllipticalRoiTool
    const ScaleOverlayTool = cornerstoneTools.ScaleOverlayTool;
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });


    useEffect(() => {
      loadImage()
      parseDicom()
    }, [imageId])

    // Listen for changes to the viewport so we can update the text overlays in the corner
    const onImageRendered = (e) => {
        console.log("image rendered")
        const viewport = cornerstone.getViewport(e.target);
        document.getElementById(
            "mrbottomleft"
        ).textContent = `WW/WC: ${Math.round(
            viewport.voi.windowWidth
        )}/${Math.round(viewport.voi.windowCenter)}`;
        document.getElementById(
            "mrbottomright"
        ).textContent = `Zoom: ${viewport.scale.toFixed(2)}`;
    }

    const loadImage = () => {
        if(dicomImageRef.current == null) {
          return
        }
        dicomImageRef.current.addEventListener('cornerstoneimagerendered', onImageRendered);

        // const imageId = "example://1";
        console.log(imageId, "imageid")
        console.log(cornerstoneTools, "tools")
        cornerstone.enable(dicomImageRef.current);
        cornerstone.loadImage(imageUrl).then(image => {
            cornerstone.displayImage(dicomImageRef.current, image)
            var viewport = {
                invert: false,
                pixelReplication: false,
                voi: {
                  windowWidth: 800,
                  windowCenter: 400
                },
                scale: 1,
                translation: {
                  x: 0,
                  y: 0
                },
                //colormap: 'hot'
            };
              
            cornerstone.setViewport(dicomImageRef.current, viewport)
            cornerstone.updateImage(dicomImageRef.current)

            cornerstoneTools.addTool(ZoomMouseWheelTool)
            cornerstoneTools.addTool(WwwcTool)
            cornerstoneTools.addTool(PanTool)
            cornerstoneTools.addTool(LengthTool)
            cornerstoneTools.addTool(EllipticalTool)
            cornerstoneTools.addTool(ScaleOverlayTool)

            console.log(cornerstoneTools, "pas load image")
            cornerstoneTools.setToolActive('ScaleOverlay')
        });
        
    };

    const parseDicom = () => {
      if(dicomImageRef.current == null) {
        return
      }
      var oReq = new XMLHttpRequest();
      try {
        oReq.open("get", imageId, true);
      } catch(err) {
        console.log(err, "XMLHttpRequest error")
      }
      oReq.responseType = "arraybuffer";
      oReq.onreadystatechange = function(oEvent) {
        console.log(oReq.readyState, "ready state")
        if(oReq.readyState === 4) {
          console.log(oReq.status, "status")
          if(oReq.status === 200){
            var byteArray = new Uint8Array(oReq.response);
            dumpByteArray(byteArray);
          } else {
            console.log('Status: HTTP Error - status code ' + oReq.status + '; error text = ' + oReq.statusText)
          }
        }
      }
      oReq.send()
    }

    const dumpByteArray = (byteArray) => {
      var kb = byteArray.length / 1024;
      var mb = kb / 1024;
      var byteStr = mb > 1 ? mb.toFixed(3) + " MB" : kb.toFixed(0) + " KB"
      console.log('Status: Parsing ' + byteStr + ' bytes, please wait..')

      setTimeout(function() {
        // Invoke the paresDicom function and get back a DataSet object with the contents
        var dataSet;
        try {
            var start = new Date().getTime();
            dataSet = dicomParser.parseDicom(byteArray);
            // Here we call dumpDataSet to recursively iterate through the DataSet and create an array
            // of strings of the contents.
            var output = [];
            dumpDataSet(dataSet, output);

            // Combine the array of strings into one string and add it to the DOM
            // document.getElementById('dropZone').innerHTML = '<ul>' + output.join('') + '</ul>';
            console.log('<ul>' + output.join('') + '</ul>')

            var end = new Date().getTime();
            var time = end - start;
            if(dataSet.warnings.length > 0) {
              // alert-warning
              console.log('Status: Warnings encountered while parsing file (file of size '+ byteStr + ' parsed in ' + time + 'ms)');

              dataSet.warnings.forEach(function(warning) {
                console.log(warning);
              });
            } else {
                var pixelData = dataSet.elements.x7fe00010;
                // alert-success
                if(pixelData) {
                    console.log('Status: Ready (file of size '+ byteStr + ' parsed in ' + time + 'ms)');
                } else {
                    console.log('Status: Ready - no pixel data found (file of size ' + byteStr + ' parsed in ' + time + 'ms)');
                }
            }

            // dump encapsulated data info
            dumpEncapsulatedInfo(dataSet);
          } catch(err) {
            // alert-danger
            console.log('Status: Error - ' + err + ' (file of size ' + byteStr + ' )')
          }
      }, 10);
    }

    const dumpEncapsulatedInfo = (dataSet) => {
      var transferSyntax = dataSet.string('x00020010');
      if(transferSyntax === undefined) {
        return;
      }
      if(isTransferSyntaxEncapsulated(transferSyntax) === false) {
        return;
      }
      var numFrames = dataSet.intString('x00280008');
      if(numFrames === undefined) {
        numFrames = 1;
      }
      for(var frame=0; frame < numFrames; frame++) {
        var pixelData = dicomParser.readEncapsulatedPixelData(dataSet, frame);
      }
    }

    const isTransferSyntaxEncapsulated = (transferSyntax) => {
      if(transferSyntax === "1.2.840.10008.1.2.4.50") // jpeg baseline
      {
        return true;
      }
      return false;
    }

    const getTag = (tag) => {
      let group = tag.substring(1,5)
      let element = tag.substring(5,9)
      let tagIndex = ("("+group+","+element+")").toUpperCase()
      let attr = TAG_DICT[tagIndex]
      return attr
    }

    const isStringVr = (vr) => {
      if(vr === 'AT' || vr === 'FL'|| vr === 'FD' || vr === 'OB' || vr === 'OF' 
          || vr === 'OW' || vr === 'SI' || vr === 'SQ' || vr === 'SS' || vr === 'UL' || vr === 'US') {
        return false;
      }
        return true;
    }

    const isASCII = (str) => {
      return /^[\x00-\x7F]*$/.test(str);
    }

    const dumpDataSet = (dataSet, output) => {
      for(var propertyName in dataSet.elements) {
        var element = dataSet.elements[propertyName];
        var text = "";
        var color = 'black';

        var tag = getTag(element.tag);
        // The output string begins with the element name (or tag if not in data dictionary), length and VR (if present).  VR is undefined for
        // implicit transfer syntaxes
        if(tag === undefined) {
          text += element.tag;
          text += "; length=" + element.length;
          if(element.hadUndefinedLength) {
            text += " <strong>(-1)</strong>";
          }

          if(element.vr) {
            text += " VR=" + element.vr +"; ";
          }

          // make text lighter since this is an unknown attribute
          color = '#C8C8C8';
        } else {
          text += tag.name;
          text += "(" + element.tag + ") :";
        }

        // Here we check for Sequence items and iterate over them if present.  items will not be set in the
        // element object for elements that don't have SQ VR type.  Note that implicit little endian
        // sequences will are currently not parsed.
        if(element.items) {
          output.push('<li>'+ text + '</li>');
          output.push('<ul>');

          // each item contains its own data set so we iterate over the items
          // and recursively call this function
          var itemNumber = 0;
          element.items.forEach(function(item) {
              output.push('<li>Item #' + itemNumber++ + '</li>')
              output.push('<ul>');
              dumpDataSet(item.dataSet, output);
              output.push('</ul>');
          })
          output.push('</ul>');
        } else {
          // use VR to display the right value
          var vr;
          if(element.vr !== undefined){
            vr = element.vr;
          } else {
            if(tag !== undefined) {
                vr = tag.vr;
            }
          }

          // if the length of the element is less than 128 we try to show it.  We put this check in
          // to avoid displaying large strings which makes it harder to use.
          if(element.length < 128) {
            // Since the dataset might be encoded using implicit transfer syntax and we aren't using
            // a data dictionary, we need some simple logic to figure out what data types these
            // elements might be.  Since the dataset might also be explicit we could be switch on the
            // VR and do a better job on this, perhaps we can do that in another example

            // First we check to see if the element's length is appropriate for a UI or US VR.
            // US is an important type because it is used for the
            // image Rows and Columns so that is why those are assumed over other VR types.
            if(element.vr === undefined && tag === undefined) {
              if(element.length === 2) {
                text += " (" + dataSet.uint16(propertyName) + ")";
              } else if(element.length === 4)
              {
                text += " (" + dataSet.uint32(propertyName) + ")";
              }

              // Next we ask the dataset to give us the element's data in string form.  Most elements are
              // strings but some aren't so we do a quick check to make sure it actually has all ascii
              // characters so we know it is reasonable to display it.
              var str = dataSet.string(propertyName);
              var stringIsAscii = isASCII(str);
              if(stringIsAscii) {
                // the string will be undefined if the element is present but has no data
                // (i.e. attribute is of type 2 or 3 ) so we only display the string if it has
                // data.  Note that the length of the element will be 0 to indicate "no data"
                // so we don't put anything here for the value in that case.
                if(str !== undefined) {
                    text += '"' + str + '"';
                }
              } else {
                if(element.length !== 2 && element.length !== 4) {
                  color = '#C8C8C8';
                  // If it is some other length and we have no string
                  text += "<i>binary data</i>";
                }
              }
            } else {
              if(isStringVr(vr)) {
                // Next we ask the dataset to give us the element's data in string form.  Most elements are
                // strings but some aren't so we do a quick check to make sure it actually has all ascii
                // characters so we know it is reasonable to display it.
                str = dataSet.string(propertyName);
                stringIsAscii = isASCII(str);

                if(stringIsAscii) {
                  // the string will be undefined if the element is present but has no data
                  // (i.e. attribute is of type 2 or 3 ) so we only display the string if it has
                  // data.  Note that the length of the element will be 0 to indicate "no data"
                  // so we don't put anything here for the value in that case.
                  if(str !== undefined) {
                      text += '"' + str + '"';
                  }
                } else {
                  if(element.length !== 2 && element.length !== 4) {
                    color = '#C8C8C8';
                    // If it is some other length and we have no string
                    text += "<i>binary data</i>";
                  }
                }
              } else if (vr === 'US') {
                text += dataSet.uint16(propertyName);
              } else if(vr === 'SS') {
                text += dataSet.int16(propertyName);
              } else if (vr === 'UL') {
                text += dataSet.uint32(propertyName);
              } else if(vr === 'SL') {
                text += dataSet.int32(propertyName);
              } else if(vr === 'FD') {
                text += dataSet.double(propertyName);
              } else if(vr === 'FL') {
                text += dataSet.float(propertyName);
              } else if(vr === 'OB' || vr === 'OW' || vr === 'UN' || vr === 'OF' || vr ==='UT') {
                color = '#C8C8C8';
                // If it is some other length and we have no string
                text += "<i>binary data of length " + element.length + " and VR " + vr + "</i>";
              } else {
                // If it is some other length and we have no string
                text += "<i>no display code for VR " + vr + " yet, sorry!</i>";
              }
            }

            if(element.length ===0) {
                color = '#C8C8C8';
            }
          } else {
            color = '#C8C8C8';

            // Add text saying the data is too long to show...
            text += "<i>data of length " + element.length + " for VR + " + vr + " too long to show</i>";
          }
        }
        // finally we add the string to our output array surrounded by li elements so it shows up in the
        // DOM as a list
        output.push('<li style="color:' + color +';">'+ text + '</li>');
      }
    }

    const toogleTool = (toolName) => {
        let updatedTools = { ...tools }
        updatedTools[toolName] = !updatedTools[toolName]
        if(updatedTools[toolName]) {
          activateTool(toolName)
        }else{
          deactivateTool(toolName)
        }
        setTools(updatedTools)
    };

    const activateTool = (toolName) => {
      console.log("activate", toolName)
      let mouseButtonMaskNumber = 1
      switch (toolName) {
        case "Pan":
          mouseButtonMaskNumber = 2
          break;
      }
      cornerstoneTools.setToolActive(toolName, { mouseButtonMask: mouseButtonMaskNumber })
    }

    const deactivateTool = (toolName) => {
      console.log("deactivate", toolName)
      cornerstoneTools.setToolDisabled(toolName)
    }

    if (imageId === "") {
        return (
            <>
            <div className="col12 d-flex justify-content-center mt-4">
                <p className="align-self-center">Loading Images URL ...</p>
            </div>
            </>
        );
    }

    return (
        <>
        {/* display dicom image url */}
        <div className="col12 d-flex justify-content-center mt-3">
            <p className="align-self-center">{imageId}</p>
        </div>
        {/* navigations */}
        <div className="col12 d-flex justify-content-center mb-3">
          <div className="btn-group" role="group" aria-label="Basic outlined example">
            <button type="button" className={`btn btn-outline-primary ${ tools["ZoomMouseWheel"] ? "active" : "" }`} onClick={() => { toogleTool("ZoomMouseWheel") }}>
              <ZoomIn />
            </button>
            <button type="button" className={`btn btn-outline-primary ${ tools["Wwwc"] ? "active" : "" }`} onClick={() => { toogleTool("Wwwc") }}>
              <Highlights />
            </button>
            <button type="button" className={`btn btn-outline-primary ${ tools["Pan"] ? "active" : "" }`} onClick={() => { toogleTool("Pan") }}>
              <Dpad />
            </button>
            <button type="button" className={`btn btn-outline-primary ${ tools["Length"] ? "active" : "" }`} onClick={() => { toogleTool("Length") }}>
              <Rulers />
            </button>
            <button type="button" className={`btn btn-outline-primary ${ tools["EllipticalRoi"] ? "active" : "" }`} onClick={() => { toogleTool("EllipticalRoi") }}>
              <Circle />
            </button>
          </div>
        </div>
        <div className="row">
          <div className="col-9">
            <div
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "inline-block",
                color: "white"
              }}
              onContextMenu={() => false}
              className="cornerstone-enabled-image"
              unselectable="on"
              // onSelectStart={() => false}
              onMouseDown={() => false}
            >
              <div ref={dicomImageRef} id="dicom-viewport" />
              <div
                id="mrtopleft"
                style={{ position: "absolute", top: 3, left: 3 }}
              >
                Patient Name
              </div>
              <div
                id="mrtopright"
                style={{ position: "absolute", top: 3, right: 3 }}
              >
                Hospital
              </div>
              <div
                id="mrbottomright"
                style={{ position: "absolute", bottom: 3, right: 3 }}
              >
                Zoom:
              </div>
              <div
                id="mrbottomleft"
                style={{ position: "absolute", bottom: 3, left: 3 }}
              >
                WW/WC:
              </div>
            </div>
          </div>

          <div className="col-3" style={{
            height: 512
          }}>
            <p>Buat Parse DCM Metadata</p>
          </div>
        </div>
        </>
    );
}

function initCornerstone() {
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  var config = {
    maxWebWorkers: navigator.hardwareConcurrency || 1,
    startWebWorkersOnDemand : true,
    taskConfiguration: {
        decodeTask : {
            initializeCodecsOnStartup: false,
            usePDFJS: false
        }
    }
  }
  cornerstoneWADOImageLoader.webWorkerManager.initialize(config)
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser
  cornerstoneTools.external.cornerstone = cornerstone
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath
  cornerstoneTools.external.Hammer = Hammer
  cornerstoneTools.init()
}
  
export default DicomViewer;