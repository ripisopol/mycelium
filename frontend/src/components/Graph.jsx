import { useEffect, useRef } from "react";
import * as d3 from "d3";

const TAG_COLORS = [
  "#5ecba1", "#c9934a", "#7aab6a",
  "#6a8fc9", "#c96a9a", "#c9c36a",
];

export default function Graph({ data, activeId, onNodeClick }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = svgRef.current.getBoundingClientRect();

    // Zoom container
    const g = svg.append("g");
    svg.call(
      d3.zoom()
        .scaleExtent([0.15, 5])
        .on("zoom", (e) => g.attr("transform", e.transform))
    );

    const nodes = data.nodes.map((d) => ({ ...d }));
    const edges = data.edges.map((d) => ({ ...d }));

    // Node sizing by degree
    const maxDeg = Math.max(
      ...nodes.map((n) => (n.out_degree || 0) + (n.in_degree || 0)),
      1
    );
    const radius = (d) => 4 + ((d.out_degree || 0) + (d.in_degree || 0)) / maxDeg * 12;

    // Color by first tag
    const tagColorMap = {};
    nodes.forEach((n) => {
      if (n.tags?.length) {
        const t = n.tags[0];
        if (!tagColorMap[t])
          tagColorMap[t] = TAG_COLORS[Object.keys(tagColorMap).length % TAG_COLORS.length];
      }
    });
    const nodeColor = (d) => (d.tags?.[0] ? tagColorMap[d.tags[0]] : "#3a4a3e");

    // Edges
    const link = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "var(--border)")
      .attr("stroke-width", 1);

    // Node groups
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end",   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on("click", (e, d) => { e.stopPropagation(); onNodeClick(d.id); });

    // Outer glow ring for active node
    node
      .append("circle")
      .attr("r", (d) => radius(d) + 5)
      .attr("fill", "none")
      .attr("stroke", "#5ecba1")
      .attr("stroke-width", 1)
      .attr("opacity", (d) => (d.id === activeId ? 0.35 : 0))
      .attr("class", "glow-ring");

    // Main circle
    node
      .append("circle")
      .attr("r", radius)
      .attr("fill", "var(--bg2)")
      .attr("stroke", nodeColor)
      .attr("stroke-width", (d) => (d.id === activeId ? 2 : 1))
      .attr("class", "main-circle");

    // Label
    node
      .append("text")
      .attr("dy", (d) => radius(d) + 11)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", "9px")
      .attr("fill", "var(--text2)")
      .attr("pointer-events", "none")
      .text((d) => (d.title.length > 20 ? d.title.slice(0, 18) + "…" : d.title));

    // Hover
    node
      .on("mouseenter", function (e, d) {
        d3.select(this).select(".main-circle")
          .attr("stroke", "#5ecba1")
          .attr("fill", "var(--bg3)")
          .attr("filter", "drop-shadow(0 0 6px rgba(94,203,161,0.3))");
        d3.select(this).select("text").attr("fill", "var(--text)");
      })
      .on("mouseleave", function (e, d) {
        d3.select(this).select(".main-circle")
          .attr("stroke", nodeColor(d))
          .attr("fill", "var(--bg2)")
          .attr("filter", null);
        d3.select(this).select("text").attr("fill", "var(--text2)");
      });

    // Simulation
    const sim = d3
      .forceSimulation(nodes)
      .force("link",      d3.forceLink(edges).id((d) => d.id).distance(90))
      .force("charge",    d3.forceManyBody().strength(-150))
      .force("center",    d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => radius(d) + 10))
      .on("tick", () => {
        link
          .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });

    return () => sim.stop();
  }, [data]);

  // Update active highlight without full redraw
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll(".glow-ring")
      .attr("opacity", (d) => (d.id === activeId ? 0.35 : 0));
    d3.select(svgRef.current)
      .selectAll(".main-circle")
      .attr("stroke-width", (d) => (d.id === activeId ? 2 : 1));
  }, [activeId]);

  if (!data || data.nodes.length === 0) {
    return (
      <div className="graph-container">
        <div className="empty-state">
          <div className="empty-glyph">⬡</div>
          <div className="empty-text">no notes yet — press + new to start</div>
        </div>
      </div>
    );
  }

  return (
    <div className="graph-container">
      <svg
        ref={svgRef}
        className="graph-svg"
        onClick={() => onNodeClick(null)}
      />
      <div className="graph-hint">scroll to zoom · drag to pan · click node to open</div>
    </div>
  );
}
