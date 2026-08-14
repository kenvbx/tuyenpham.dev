import {
  IconArticle,
  IconBrandTabler,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconFileText,
  IconLayoutDashboard,
  IconLogin2,
  IconLogout2,
  IconMenu2,
  IconPalette,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShieldLock,
  IconTrash,
  IconUsers,
  IconX,
  type IconProps as TablerIconProps,
  type TablerIcon,
} from "@tabler/icons-react";

import { cn } from "../utils/cn.js";

const cmsIcons = {
  article: IconArticle,
  brand: IconBrandTabler,
  chevronLeft: IconChevronLeft,
  chevronRight: IconChevronRight,
  dashboard: IconLayoutDashboard,
  edit: IconEdit,
  fileText: IconFileText,
  login: IconLogin2,
  logout: IconLogout2,
  media: IconPhoto,
  menu: IconMenu2,
  palette: IconPalette,
  plus: IconPlus,
  search: IconSearch,
  settings: IconSettings,
  shield: IconShieldLock,
  trash: IconTrash,
  users: IconUsers,
  x: IconX,
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
