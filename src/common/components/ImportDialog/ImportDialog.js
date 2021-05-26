/* eslint-disable radix */
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import TextField from "@material-ui/core/TextField";
import LoadingIndicator from "../LoadingIndicator";
import { INITIAL_STATE } from "../../../store/editor/constants";
import { changeAppIsLoading } from "../../../store/app/actions";
import {
  changeCanvasSize,
  changeGridSize,
  changePalette,
  changePosition,
  changeLayers,
  changeSelectedLayer,
  changeTileset,
  changeTilesetImage,
} from "../../../store/editor/actions";
import {
  selectLayers,
  selectPalette,
  selectTileset,
} from "../../../store/editor/selectors";
import { getOrderedPalette } from "../../utils/colors";
import { getImageDimensions } from "../../utils/image";
import { useStyles } from "./ImportDialog.styled";
import ImportPreview from "../ImportPreview/ImportPreview";

const IMPORT_MODES = {
  NEW_PROJECT: "NEW_PROJECT",
  NEW_LAYER: "NEW_LAYER",
};

const ImportDialog = ({ onClose }) => {
  const classes = useStyles();
  const layers = useSelector(selectLayers);
  const palette = useSelector(selectPalette);
  const tileset = useSelector(selectTileset);

  const dispatch = useDispatch();

  const onChangeAppIsLoading = (value) => dispatch(changeAppIsLoading(value));
  const onChangePalette = (value) => dispatch(changePalette(value));
  const onChangePosition = (x, y) => dispatch(changePosition(x, y));
  const onChangeCanvasSize = (width, height) =>
    dispatch(changeCanvasSize(width, height));
  const onChangeGridSize = (width, height) =>
    dispatch(changeGridSize(width, height));
  const onChangeSelectedLayer = (value) => dispatch(changeSelectedLayer(value));
  const onChangeTileset = (value) => dispatch(changeTileset(value));
  const onSaveLayers = (value) => dispatch(changeLayers(value));
  const onSaveTilesetImage = (value) => dispatch(changeTilesetImage(value));

  const [gridSize, setGridSize] = useState({
    w: tileset.tilewidth,
    h: tileset.tileheight,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [name, setName] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState(IMPORT_MODES.NEW_PROJECT);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ w: 0, h: 0 });

  const layerCanvas = document.createElement("canvas");
  const layerContext = layerCanvas.getContext("2d");
  const layerImage = new window.Image();

  const tilesetCanvas = document.createElement("canvas");
  const tilesetContext = tilesetCanvas.getContext("2d");
  const tilesetImage = new window.Image();

  useEffect(() => {
    if (mode === IMPORT_MODES.NEW_LAYER) {
      setGridSize({ w: tileset.tilewidth, h: tileset.tileheight });
    }
  }, [mode]);

  const onSave = () => {
    setIsProcessing(true);
    onChangeAppIsLoading(true);
    setTimeout(() => {
      const { w: layerwidth, h: layerheight } = imageDimensions;
      const { w: tilewidth, h: tileheight } = gridSize;
      const { columns, image, tilecount } =
        mode === IMPORT_MODES.NEW_PROJECT ? INITIAL_STATE.tileset : tileset;

      const tw = columns * tilewidth;
      const th = Math.ceil(tilecount / columns) * tileheight;
      const tempPalette = IMPORT_MODES.NEW_PROJECT ? [] : [...palette];
      const tempTiles = [];
      const tempTilesHash = [];
      const layer = {
        id: uuidv4(),
        opacity: 255,
        visible: true,
        width: Math.round(layerwidth / tilewidth),
        height: Math.round(layerheight / tileheight),
        data: [],
      };
      const w = layer.width * tilewidth;
      const h = layer.height * tileheight;

      layerCanvas.width = w;
      layerCanvas.height = h;
      tilesetCanvas.width = tw;
      tilesetCanvas.height = th;

      tilesetContext.clearRect(0, 0, tw, th);
      layerContext.clearRect(0, 0, w, h);
      layerContext.drawImage(
        previewImage,
        offset.x,
        offset.y,
        layerwidth,
        layerheight,
      );

      const processCurrentTileset = () => {
        for (let y = 0; y < th; y += tileheight) {
          for (let x = 0; x < tw; x += tilewidth) {
            const data = tilesetContext.getImageData(
              x,
              y,
              tilewidth,
              tileheight,
            );
            const key = data.data.toString();
            if (tempTilesHash.indexOf(key) === -1) {
              tempTilesHash.push(key);
              tempTiles.push(data);
            }
          }
        }
      };

      const processNewTileset = () => {
        for (let y = 0; y < layerCanvas.height; y += tileheight) {
          for (let x = 0; x < layerCanvas.width; x += tilewidth) {
            const data = layerContext.getImageData(x, y, tilewidth, tileheight);
            const empty = !data.data.some((channel) => channel !== 0);
            const key = data.data.toString();
            if (empty) {
              layer.data.push(0);
            } else if (tempTilesHash.indexOf(key) === -1) {
              const number = tempTilesHash.length;
              tilesetCanvas.width = columns * tilewidth;
              tilesetCanvas.height =
                Math.ceil((number + 1) / columns) * tileheight;
              tempTilesHash.push(key);
              tempTiles.push(data);
              layer.data.push(number + 1);
            } else {
              layer.data.push(tempTilesHash.indexOf(key) + 1);
            }
          }
        }
        tempTiles.forEach((tile, i) => {
          const posX = (i % columns) * tilewidth;
          const posY = (Math.ceil((i + 1) / columns) - 1) * tileheight;
          tilesetContext.putImageData(tile, posX, posY);
        });

        // // Generate new palette from tileset
        // for (let y = 0; y < tilesetCanvas.height; y += 1) {
        //   for (let x = 0; x < tilesetCanvas.width; x += 1) {
        //     const p = Object.values(tilesetContext.getImageData(x, y, 1, 1).data)
        //     p[3] = 255
        //     if (tempPalette.indexOf(p.join()) === -1) {
        //       tempPalette.push(p.join())
        //     }
        //   }
        // }
        // onChangePalette(getOrderedPalette(tempPalette))

        if (mode === IMPORT_MODES.NEW_PROJECT) {
          onChangePosition(0, 0);
          onChangeCanvasSize(w, h);
          onChangeGridSize(tilewidth, tileheight);
          onSaveLayers([{ ...layer, name }]);
          onChangeTileset({
            ...INITIAL_STATE.tileset,
            tilewidth,
            tileheight,
            tilecount: tempTiles.length,
            lastUpdateTime: performance.now(),
          });
        } else {
          onSaveLayers([...layers, { ...layer, name }]);
          onChangeTileset({
            ...tileset,
            tilecount: tempTiles.length,
            lastUpdateTime: performance.now(),
          });
        }

        tilesetCanvas.toBlob((blob) => {
          onSaveTilesetImage(blob);
          onChangeSelectedLayer(layer.id);
          setIsProcessing(false);
          onChangeAppIsLoading(false);
          onClose();
        }, "image/png");
      };

      if (mode === IMPORT_MODES.NEW_LAYER && image) {
        tilesetImage.src = image;
        tilesetImage.onload = () => {
          tilesetContext.drawImage(tilesetImage, 0, 0, tw, th);
          processCurrentTileset();
          processNewTileset();
        };
      } else {
        processNewTileset();
      }
    }, 100);
  };

  const onChange = (e) => {
    const file = e.target.files[0];
    const layerReader = new FileReader();

    setName(file.name);
    setIsLoaded(false);
    setIsProcessing(true);

    layerReader.readAsDataURL(file);
    layerReader.onload = async (ev) => {
      const content = ev.target.result;
      const { w, h } = await getImageDimensions(content);

      layerCanvas.width = w;
      layerCanvas.height = h;

      layerImage.src = content;
      layerImage.onload = () => {
        setImageDimensions({ w, h });
        setPreviewImage(layerImage);
        setIsProcessing(false);
        setIsLoaded(true);
      };
    };
  };

  const onCancel = () => {
    if (isLoaded) {
      setIsLoaded(false);
      setPreviewImage(null);
    } else {
      onClose();
    }
  };

  return (
    <Dialog
      open
      disableBackdropClick
      disableEscapeKeyDown
      onClose={onClose}
      aria-labelledby="form-dialog-title"
    >
      <DialogTitle id="form-dialog-title">Import</DialogTitle>
      <DialogContent>
        {isProcessing && <LoadingIndicator />}
        {!isProcessing && !isLoaded && (
          <DialogContentText>
            You can choose a graphic file containing a tiled map.
          </DialogContentText>
        )}
        {!isProcessing && isLoaded && (
          <>
            <FormControl component="fieldset">
              <RadioGroup
                row
                aria-label="position"
                name="position"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
              >
                <FormControlLabel
                  value={IMPORT_MODES.NEW_PROJECT}
                  control={<Radio color="primary" />}
                  label="Import as a new project"
                />
                <FormControlLabel
                  value={IMPORT_MODES.NEW_LAYER}
                  control={<Radio color="primary" />}
                  label="Add as a new layer"
                />
              </RadioGroup>
            </FormControl>
            <ImportPreview
              {...{
                imageDimensions,
                gridSize,
                offset,
                previewImage,
              }}
            />
            <Grid container className={classes.root}>
              <Grid item xs={mode === IMPORT_MODES.NEW_PROJECT ? 4 : 8}>
                <TextField
                  className={classes.input}
                  fullWidth={mode === IMPORT_MODES.NEW_LAYER}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  id="name"
                  label="Layer name"
                />
              </Grid>
              {mode === IMPORT_MODES.NEW_PROJECT && (
                <>
                  <Grid item xs={2}>
                    <TextField
                      type="number"
                      className={classes.input}
                      defaultValue={gridSize.w}
                      onChange={(event) =>
                        setGridSize({
                          ...gridSize,
                          w: parseInt(event.target.value),
                        })
                      }
                      id="width"
                      label="Tile width"
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      type="number"
                      className={classes.input}
                      defaultValue={gridSize.h}
                      onChange={(event) =>
                        setGridSize({
                          ...gridSize,
                          h: parseInt(event.target.value),
                        })
                      }
                      id="height"
                      label="Tile height"
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={2}>
                <TextField
                  type="number"
                  className={classes.input}
                  defaultValue={offset.x}
                  onChange={(event) =>
                    setOffset({ ...offset, x: parseInt(event.target.value) })
                  }
                  id="offsetX"
                  label="Offset X"
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  type="number"
                  className={classes.input}
                  defaultValue={offset.y}
                  onChange={(event) =>
                    setOffset({ ...offset, y: parseInt(event.target.value) })
                  }
                  id="offsetY"
                  label="Offset y"
                />
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>
      {!isProcessing && (
        <DialogActions>
          <Button onClick={onCancel} color="primary">
            Cancel
          </Button>
          {!isLoaded && (
            <Button variant="contained" component="label">
              Upload File
              <input type="file" hidden accept=".png" onChange={onChange} />
            </Button>
          )}
          {isLoaded && (
            <Button onClick={onSave} variant="contained">
              Save
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};

ImportDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ImportDialog;
