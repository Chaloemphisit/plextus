import React from 'react'
import Konva from 'konva'
import { useSelector } from 'react-redux'

import { getCoordsFromPos, getPointerRelativePos } from '../../common/utils/konva'
import { selectCanvas, selectGrid, selectWorkspace, selectTileset } from '../../store/editor/selectors'
import { Layer } from '../../store/editor/types'
import { StyledLabel } from './TileInfoLabel.styled'

interface Props {
    pointerPosition: Konva.Vector2d | null
    selectedLayer: Layer | null
}

const TileInfoLabel: React.FunctionComponent<Props> = ({ pointerPosition, selectedLayer }) => {
    const grid = useSelector(selectGrid)
    const canvas = useSelector(selectCanvas)
    const tileset = useSelector(selectTileset)
    const workspace = useSelector(selectWorkspace)

    const offset = selectedLayer?.offset || { x: 0, y: 0 }
    const pointerRelPosition = getPointerRelativePos(workspace, pointerPosition as Konva.Vector2d, offset)
    const { x, y } = getCoordsFromPos(grid, pointerRelPosition)

    const gid = selectedLayer
        ? selectedLayer.data &&
          selectedLayer.width &&
          selectedLayer.data[x + ((selectedLayer.width * tileset.tilewidth) / grid.width) * y]
        : null

    return selectedLayer &&
        selectedLayer.data &&
        x >= 0 &&
        y >= 0 &&
        x < canvas.width / grid.width &&
        y < canvas.height / grid.height ? (
        <StyledLabel>
            {x}, {y} [{gid || 'empty'}]
        </StyledLabel>
    ) : null
}
TileInfoLabel.displayName = 'TileInfoLabel'

export default TileInfoLabel
