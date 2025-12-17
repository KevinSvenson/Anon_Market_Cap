import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
}

const TableSkeleton = ({ rows = 10 }: TableSkeletonProps) => {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 sm:px-4 py-3 text-left">
                <Skeleton className="h-4 w-8" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-left">
                <Skeleton className="h-4 w-24" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-center hidden md:table-cell">
                <Skeleton className="h-4 w-20 mx-auto" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-center hidden lg:table-cell">
                <Skeleton className="h-4 w-16 mx-auto" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-right hidden lg:table-cell">
                <Skeleton className="h-4 w-20 ml-auto" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-right hidden lg:table-cell">
                <Skeleton className="h-4 w-16 ml-auto" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-right hidden xl:table-cell">
                <Skeleton className="h-4 w-12 ml-auto" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-right">
                <Skeleton className="h-4 w-12 ml-auto" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-right hidden md:table-cell">
                <Skeleton className="h-4 w-12 ml-auto" />
              </th>
              <th className="px-3 sm:px-4 py-3 text-center hidden sm:table-cell">
                <Skeleton className="h-4 w-20 mx-auto" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-3 sm:px-4 py-3 sm:py-4">
                  <Skeleton className="h-4 w-8" />
                </td>
                <td className="px-3 sm:px-4 py-3 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-4 py-3 sm:py-4 text-center hidden md:table-cell">
                  <Skeleton className="h-5 w-20 mx-auto" />
                </td>
                <td className="px-3 sm:px-4 py-3 sm:py-4 text-center hidden lg:table-cell">
                  <Skeleton className="h-4 w-12 mx-auto" />
                </td>
                <td className="px-3 sm:px-4 py-3 sm:py-4 text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </td>
                <td className="px-3 sm:px-4 py-3 sm:py-4 text-right hidden lg:table-cell">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </td>
                <td className="px-3 sm:px-4 py-3 sm:py-4 text-right hidden lg:table-cell">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </td>
                <td className="px-3 sm:px-4 py-3 sm:py-4 text-right hidden xl:table-cell">
                  <Skeleton className="h-4 w-12 ml-auto" />
                </td>
                <td className="px-3 sm:px-4 py-3 sm:py-4 text-right">
                  <Skeleton className="h-4 w-12 ml-auto" />
                </td>
                <td className="px-3 sm:px-4 py-3 sm:py-4 text-right hidden md:table-cell">
                  <Skeleton className="h-4 w-12 ml-auto" />
                </td>
                <td className="px-3 sm:px-4 py-3 sm:py-4 text-center hidden sm:table-cell">
                  <Skeleton className="h-8 w-24 mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableSkeleton;

