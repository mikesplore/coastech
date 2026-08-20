"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import { Fragment } from "react"
import CoastTechMenu from "@modules/store/components/coast-tech-menu"

const SideMenu = () => {
  return (
    <div className="h-full lg:hidden">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  aria-label="Open Coast Tech menu"
                  className="relative flex h-full items-center rounded-full p-2 text-primary transition-opacity duration-150 hover:bg-surface-container focus:outline-none active:opacity-80"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-black/0 pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100 backdrop-blur-2xl"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 backdrop-blur-2xl"
                leaveTo="opacity-0"
              >
                <PopoverPanel className="absolute inset-x-0 z-[51] m-3 flex h-[calc(100vh-1.5rem)] w-[min(88vw,24rem)] flex-col text-sm text-ui-fg-on-color">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex h-full flex-col rounded-2xl border border-surface-variant bg-surface-container-lowest p-5 text-on-surface shadow-2xl"
                  >
                    <div className="flex justify-end" id="xmark">
                      <button data-testid="close-menu-button" onClick={close}>
                        <XMark />
                      </button>
                    </div>
                    <CoastTechMenu />
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
