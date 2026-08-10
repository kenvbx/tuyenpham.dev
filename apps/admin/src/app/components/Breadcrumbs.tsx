import { CmsIcon } from "@cms/ui";
import { Link, useLocation } from "react-router-dom";

import { getBreadcrumbs } from "../navigation/navigation-registry";

export function Breadcrumbs() {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {breadcrumbs.map((breadcrumb, index) => {
        const isCurrent = index === breadcrumbs.length - 1;

        return (
          <span key={breadcrumb.to}>
            {index > 0 && <CmsIcon name="chevronRight" size={14} />}
            {isCurrent ? (
              <span aria-current="page">{breadcrumb.label}</span>
            ) : (
              <Link to={breadcrumb.to}>{breadcrumb.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
