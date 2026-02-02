/**
 * Peer Network Graph Component
 *
 * SVG-based visual representation of peer-to-peer network topology.
 */
import { Tooltip } from '@heroui/react'

import type { PeerInfo } from '@/lib/yjs'

interface PeerNetworkGraphProps {
  peers: PeerInfo[]
  status: 'disabled' | 'connecting' | 'connected'
  localLabel: string
  peerLabel: string
  emptyLabel: string
}

// SVG dimensions
const SVG_WIDTH = 240
const SVG_HEIGHT = 120
const CENTER_X = SVG_WIDTH / 2
const CENTER_Y = SVG_HEIGHT / 2
const RADIUS = 90

export function PeerNetworkGraph({
  peers,
  status,
  localLabel,
  peerLabel,
  emptyLabel,
}: PeerNetworkGraphProps) {
  // Filter peers for display (local + remote)
  const localPeer = peers.find((p) => p.isLocal)
  const remotePeers = peers.filter((p) => !p.isLocal)
  const displayPeers = localPeer ? [localPeer, ...remotePeers] : remotePeers

  // Render a peer node
  const renderPeerNode = (peer: PeerInfo, index: number, total: number) => {
    const isLocal = peer.isLocal
    // Calculate position around the center (start at 0 degrees / right)
    const angle = (index / Math.max(total, 1)) * 2 * Math.PI
    const x = isLocal ? CENTER_X : CENTER_X + RADIUS * Math.cos(angle)
    const y = isLocal ? CENTER_Y : CENTER_Y + RADIUS * Math.sin(angle)

    const nodeSize = isLocal ? 48 : 36
    const halfSize = nodeSize / 2
    const peerId = peer.clientId.toString(16).slice(-4).toUpperCase()

    return (
      <g key={peer.clientId}>
        {/* Connection line to center (for non-local nodes) */}
        {!isLocal && (
          <line
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={x}
            y2={y}
            className="stroke-primary-300 dark:stroke-primary-700"
            strokeWidth="2"
            strokeDasharray="4 2"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="12"
              dur="1s"
              repeatCount="indefinite"
            />
          </line>
        )}

        {/* Node */}
        <Tooltip content={isLocal ? localLabel : `${peerLabel} #${peerId}`}>
          <g style={{ cursor: 'pointer' }}>
            {/* Glow effect for local node */}
            {isLocal && (
              <circle
                cx={x}
                cy={y}
                r={halfSize + 4}
                className="fill-primary-200/50 dark:fill-primary-800/50"
              >
                <animate
                  attributeName="r"
                  values={`${halfSize + 2};${halfSize + 6};${halfSize + 2}`}
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5;0.3;0.5"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Main circle */}
            <circle
              cx={x}
              cy={y}
              r={halfSize}
              className={
                isLocal
                  ? 'fill-primary-500 dark:fill-primary-400'
                  : 'fill-default-300 dark:fill-default-600'
              }
            />

            {/* Icon background */}
            <circle
              cx={x}
              cy={y}
              r={halfSize - 4}
              className={
                isLocal
                  ? 'fill-primary-600 dark:fill-primary-500'
                  : 'fill-default-400 dark:fill-default-500'
              }
            />

            {/* Device icon */}
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white text-xs font-bold"
              style={{ fontSize: isLocal ? '14px' : '11px' }}
            >
              ●
            </text>
          </g>
        </Tooltip>

        {/* Label */}
        <text
          x={x}
          y={y + halfSize + 14}
          textAnchor="middle"
          className="fill-default-600 dark:fill-default-400 text-[10px] font-medium"
        >
          {isLocal ? localLabel : `#${peerId}`}
        </text>
      </g>
    )
  }

  return (
    <svg
      width={SVG_WIDTH}
      height={SVG_HEIGHT}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      className="overflow-visible"
    >
      {/* Background circle for the network */}
      <circle
        cx={CENTER_X}
        cy={CENTER_Y}
        r={RADIUS + 10}
        className="fill-none stroke-default-200 dark:stroke-default-700"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      {/* Render peer nodes */}
      {displayPeers.map((peer, index) =>
        renderPeerNode(
          peer,
          peer.isLocal ? 0 : index,
          Math.max(remotePeers.length, 1),
        ),
      )}

      {/* Empty state when no peers */}
      {displayPeers.length === 0 && (
        <text
          x={CENTER_X}
          y={CENTER_Y}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-default-400 text-xs"
        >
          {status === 'connecting' ? '...' : emptyLabel}
        </text>
      )}
    </svg>
  )
}
