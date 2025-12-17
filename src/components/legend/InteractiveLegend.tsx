import { useState, useEffect } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getAllTechnologies, 
  getAllPrivacyLevels,
  getTechnologyColor,
  getTechnologyDisplayName,
  getPrivacyLevelColor,
  type PrivacyTechnology,
  type PrivacyLevel
} from "@/data/privacyMetadata";
import { TECH_DESCRIPTIONS } from "@/data/technologyDescriptions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InteractiveLegendProps {
  collapsed?: boolean;
  activeTechnology: PrivacyTechnology | "all";
  activePrivacyLevel: PrivacyLevel | "all";
  activeDisplayTech?: string | null;
  onTechnologyClick: (tech: PrivacyTechnology | "all") => void;
  onPrivacyLevelClick: (level: PrivacyLevel | "all") => void;
  onDisplayTechClick?: (tech: string | null) => void;
  coinCounts?: Record<string, number>;
  uniqueDisplayTechs?: string[];
  showTooltips?: boolean;
}

const InteractiveLegend = ({
  collapsed = true,
  activeTechnology,
  activePrivacyLevel,
  activeDisplayTech,
  onTechnologyClick,
  onPrivacyLevelClick,
  onDisplayTechClick,
  coinCounts = {},
  uniqueDisplayTechs = [],
  showTooltips = true,
}: InteractiveLegendProps) => {
  const [isOpen, setIsOpen] = useState(!collapsed);
  const [isSpecificTechOpen, setIsSpecificTechOpen] = useState(false);

  // Sync state with collapsed prop
  useEffect(() => {
    setIsOpen(!collapsed);
  }, [collapsed]);

  const technologies = getAllTechnologies();
  const privacyLevels = getAllPrivacyLevels();

  const renderPrivacyDots = (level: PrivacyLevel) => {
    const totalSegments = 3;
    const filledSegments = level === "High" ? 3 : level === "Medium" ? 2 : 1;
    const activeColor = level === "High" ? "bg-green-500" 
      : level === "Medium" ? "bg-yellow-500" : "bg-gray-500";
    
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "w-3 h-2 rounded-sm",
              i < filledSegments ? activeColor : "bg-muted"
            )}
          />
        ))}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-4 w-4" />
        <span>Understanding Privacy Technologies</span>
        <ChevronDown className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <button
        onClick={() => setIsOpen(false)}
        className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"
      >
        <Info className="h-4 w-4" />
        <span>Understanding Privacy Technologies</span>
        <ChevronDown className="h-4 w-4 rotate-180" />
      </button>

      <TooltipProvider>
        {/* Main Categories */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Main Categories
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                onTechnologyClick("all");
                onDisplayTechClick?.(null);
              }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                activeTechnology === "all" && !activeDisplayTech
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              )}
            >
              All
            </button>
            {technologies.map((tech) => {
              const count = coinCounts[tech] || 0;
              const isActive = activeTechnology === tech && !activeDisplayTech;
              const badge = (
                <button
                  onClick={() => {
                    onTechnologyClick(tech);
                    onDisplayTechClick?.(null);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                    getTechnologyColor(tech),
                    isActive && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  {getTechnologyDisplayName(tech)}
                  {count > 0 && (
                    <span className="ml-1.5 text-muted-foreground">
                      ({count})
                    </span>
                  )}
                </button>
              );

              if (showTooltips && TECH_DESCRIPTIONS[tech]) {
                return (
                  <Tooltip key={tech}>
                    <TooltipTrigger asChild>{badge}</TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{TECH_DESCRIPTIONS[tech]}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={tech}>{badge}</div>;
            })}
          </div>
        </div>

        {/* Specific Technologies (displayTech values) */}
        {uniqueDisplayTechs.length > 0 && onDisplayTechClick && (
          <div>
            <button
              onClick={() => setIsSpecificTechOpen(!isSpecificTechOpen)}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors w-full mb-2"
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", isSpecificTechOpen && "rotate-180")} />
              <span>Specific Technologies ({uniqueDisplayTechs.length})</span>
            </button>
            {isSpecificTechOpen && (
              <div className="flex flex-wrap gap-2 mt-2">
                {uniqueDisplayTechs.map((displayTech) => {
                  const count = coinCounts[displayTech] || 0;
                  const isActive = activeDisplayTech === displayTech;
                  return (
                    <button
                      key={displayTech}
                      onClick={() => {
                        onDisplayTechClick(displayTech);
                        onTechnologyClick("all"); // Clear main tech filter when filtering by displayTech
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-2"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      )}
                    >
                      {displayTech}
                      {count > 0 && (
                        <span className="ml-1.5 text-muted-foreground">
                          ({count})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Privacy Strength */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Privacy Strength
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onPrivacyLevelClick("all")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-2",
                activePrivacyLevel === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              )}
            >
              All
            </button>
            {privacyLevels.map((level) => {
              const count = coinCounts[level] || 0;
              const isActive = activePrivacyLevel === level;
              const badge = (
                <button
                  onClick={() => onPrivacyLevelClick(level)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-2",
                    getPrivacyLevelColor(level),
                    isActive && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  {renderPrivacyDots(level)}
                  <span>{level}</span>
                  {count > 0 && (
                    <span className="text-muted-foreground">({count})</span>
                  )}
                </button>
              );

              return <div key={level}>{badge}</div>;
            })}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default InteractiveLegend;

