import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  Notification,
} from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

const typeStyles: Record<string, string> = {
  info: "border-l-primary",
  warning: "border-l-signal-warning",
  error: "border-l-signal-critical",
  success: "border-l-signal-nominal",
};

const typeIcons: Record<string, string> = {
  info: "bg-primary/10 text-primary",
  warning: "bg-signal-warning/10 text-signal-warning",
  error: "bg-signal-critical/10 text-signal-critical",
  success: "bg-signal-nominal/10 text-signal-nominal",
};

function NotificationItem({ notification }: { notification: Notification }) {
  const markAsRead = useMarkAsRead();
  const deleteNotification = useDeleteNotification();

  return (
    <div
      className={cn(
        "p-3 border-l-2 bg-card/50 hover:bg-card transition-colors relative group",
        typeStyles[notification.type] || typeStyles.info,
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-2 h-2 rounded-full mt-2 flex-shrink-0",
            notification.is_read ? "bg-muted" : typeIcons[notification.type]?.split(" ")[0] || "bg-primary"
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs font-medium text-foreground truncate">
            {notification.title}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground/50 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => markAsRead.mutate(notification.id)}
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-signal-critical hover:text-signal-critical"
            onClick={() => deleteNotification.mutate(notification.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications, isLoading } = useNotifications();
  const unreadCount = useUnreadCount();
  const markAllAsRead = useMarkAllAsRead();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-signal-critical text-[10px] font-mono flex items-center justify-center text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-background border-border"
        align="end"
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Notifications
          </h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] font-mono gap-1"
                onClick={() => markAllAsRead.mutate()}
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4 text-center">
              <p className="font-mono text-xs text-muted-foreground">Loading...</p>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="font-mono text-xs text-muted-foreground">
                No notifications
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
