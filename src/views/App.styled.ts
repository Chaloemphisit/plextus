import styled from '@emotion/styled'
import { IMuiTheme } from '../common/types'
import { RIGHT_BAR_WIDTH } from '../common/constants'

export const StyledWrapper = styled.div`
    flex-direction: column;
    display: flex;
    margin: 0 auto;
    padding: 0;
    background-color: ${({ theme }: IMuiTheme) => theme?.palette.background.default || '#222'};
    min-height: 100%;
    min-width: 100%;
`

export const StyledContainer = styled.div`
    height: calc(100vh);
    display: flex;
`

export const StyledMiddleContainer = styled.div`
    display: flex;
    flex-direction: column;
    background-color: ${({ theme }: IMuiTheme) => (theme?.palette.mode === 'dark' ? '#222' : '#EEE')};
    width: 100%;
    height: 100%;
`

export const StyledRightContainer = styled.div`
    width: ${RIGHT_BAR_WIDTH}px;
    min-width: ${RIGHT_BAR_WIDTH}px;
    max-width: ${RIGHT_BAR_WIDTH}px;
    display: flex;
    flex-direction: column;
    padding: 5px;
    height: 100%;
    background-color: ${({ theme }: IMuiTheme) => theme?.palette.action.disabledBackground || '#333'};
    border-top: 1px solid ${({ theme }: IMuiTheme) => theme?.palette.divider || '#222'};
    border-left: 1px solid ${({ theme }: IMuiTheme) => theme?.palette.divider || '#222'};
    color: ${({ theme }: IMuiTheme) => theme?.palette.text.secondary || '#ccc'};
    font-size: small;
`