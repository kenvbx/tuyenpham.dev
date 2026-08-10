import {
  IconArticle,
  IconBrandTabler,
  IconFileText,
  IconLayoutDashboard,
  IconLogin2,
  IconMenu2,
  IconPhoto,
  IconSettings,
  IconUsers,
  type IconProps as TablerIconProps,
  type TablerIcon,
} from "@tabler/icons-react";

import { cn } from "../utils/cn.js";

const cmsIcons = {
  article: IconArticle,
  brand: IconBrandTabler,
  dashboard: IconLayoutDashboard,
  fileText: IconFileText,
  login: IconLogin2,
  media: IconPhoto,
  menu: IconMenu2,
  settings: IconSettings,
  users: IconUsers,
} satisfies Record<string, TablerIcon>;

export type CmsIconName = keyof typeof cmsIcons;

export type CmsIconProps = Omit<TablerIconProps, "name"> & {
  name: CmsIconName;
};

export function CmsIcon({ className, name, size = 18, stroke = 1.75, ...props }: CmsIconProps) {
  const Icon = cmsIcons[name];
  const accessibilityProps = props["aria-label"] ? {} : { "aria-hidden": true };

  return (
    <Icon
      className={cn("cms-icon", className)}
      size={size}
      stroke={stroke}
      {...accessibilityProps}
      {...props}
    />
  );
}
