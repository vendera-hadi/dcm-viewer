import { useEffect, useRef, useState } from "react";
import { ZoomIn, Highlights, Dpad, Rulers, Circle } from "react-bootstrap-icons";
import Hammer from "hammerjs";
import * as cornerstone from "cornerstone-core";
import * as cornerstoneTools from "cornerstone-tools";
import * as cornerstoneMath from "cornerstone-math";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import * as dicomParser from "dicom-parser";

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