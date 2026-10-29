import * as React from "react"
import { Menu } from "lucide-react"

import { useMobileScreen } from "@/shared/hooks/useMobileScreen"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/shadcn/sheet"
import { cn } from "@/shared/utils/tailwind/cn"

const SIDEBAR_WIDTH = "272px"
const SIDEBAR_WIDTH_MOBILE = "296px"
const SIDEBAR_WIDTH_ICON = "60px"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
}) {
  const isMobile = useMobileScreen(1024)

  const [openMobile, setOpenMobile] = React.useState(false)

  const [open, setOpen] = React.useState(defaultOpen)

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn("group/sidebar-wrapper flex min-h-svh w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

// Sempre à esquerda, variante "sidebar", colapsando para ícone
function Sidebar({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className={cn("sidebar-mobile w-(--sidebar-width) max-w-[calc(100vw-16px)] p-0", className)}
          overlayClassName="sidebar-overlay bg-black/20 backdrop-blur-custom"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side="left"
          onCloseAutoFocus={(event) => {
            const trigger = document.querySelector<HTMLButtonElement>('[data-sidebar="trigger"]')
            if (trigger) {
              event.preventDefault()
              trigger.focus()
            }
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Menu de navegação do painel.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className={cn("group peer md:block hidden")}
      data-state={state}
      data-collapsible={state === "collapsed" ? "icon" : ""}
      data-slot="sidebar"
    >
      <div
        data-slot="sidebar-gap"
        className="sidebar-motion relative bg-transparent group-data-[collapsible=icon]:w-(--sidebar-width-icon) w-(--sidebar-width)"
      />

      <div
        data-slot="sidebar-container"
        className={cn(
          "sidebar-motion fixed z-10 hidden w-(--sidebar-width) md:flex",
          "top-2 bottom-2 h-auto left-2",
          "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
          className
        )}
        {...props}
      >
        {/* CONTEÚDO INTERNO DA SIDEBAR */}
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="flex h-full w-full flex-col"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar, openMobile } = useSidebar()

  return (
    <button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      aria-expanded={openMobile}
      aria-controls="sidebar-navigation"
      // after: amplia a área de toque para 44px sem mudar o visual do ícone de 24px
      className={cn("relative cursor-pointer rounded-md outline-none after:absolute after:-inset-2.5 focus-visible:ring-[3px] focus-visible:ring-ring/70", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <Menu className="size-6 " />
      <span className="sr-only">Abrir menu</span>
    </button>
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
}
