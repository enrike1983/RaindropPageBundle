<?php

namespace Raindrop\PageBundle\Directory;

use Raindrop\PageBundle\Directory\Node;

class Tree
{
    protected $pagesRepository, $root, $session;

    public function __construct($pagesRepository, $session)
    {
        $this->pagesRepository = $pagesRepository;
        $this->session = $session;
    }

    public function buildTree($pages = null)
    {
        if (is_null($pages)) {
            $pages = $this->pagesRepository->findByCountry($this->session->get('raindrop:admin:country'));
        }

        $this->root = new Node(Node::ROOT);

        foreach ($pages as $page) {

            if (!$page->hasRoute()) {
                continue;
            }

            if ($page->getRoute()->getPath() == '/') {
                $this->root->setPageId($page->getId());
            }

            if (is_null($page->getRoute())) {
                continue;
            }

            $array = $this->getCleanPathArray($page->getRoute()->getPath());

            $current = $this->root;

            foreach ($array as $dir) {

                if (!empty($dir)) {
                    if (!$current->hasChild($dir)) {
                        $node = new Node($dir, $current, $dir);

                        // if this "node" is a real page, mark it.
                        if ($node->getPath() == $page->getRoute()->getPath()) {
                            $node->setPageId($page->getId());

                            /**
                             * When Tree is used to build menu, pages are
                             * passed as argument with the menu entity attached
                             * so we store a reference of the menu into the
                             * node.
                             */
                            $menus = $page->getMenus();
                            if (count($menus) == 1) {
                                $node->setMenuId($menus[0]->getId());
                                $node->setImage($menus[0]->getImagePath());
                                $node->setTitle($menus[0]->getLabelString());
                            } else {
                                $node->setTitle($page->getTitle());
                            }
                        }

                        $current->addChild($node);
                    }

                    /**
                     * Sometimes node has already been registered as parent
                     * of another node but not marked as a real page, this fixes.
                     */
                    if ($current->getPath() . "/{$dir}" == $page->getRoute()->getPath()) {
                        $current->getChild($dir)->setPageId($page->getId());
                        $current->getChild($dir)->setTitle($page->getTitle());

                        $menus = $page->getMenus();
                        if (count($menus) == 1) {
                            $current->getChild($dir)->setMenuId($menus[0]->getId());
                            $current->getChild($dir)->setImage($menus[0]->getImagePath());
                        }
                    }

                    $current = $current->getChild($dir);
                }
            }
        }

        return $this;
    }

    public function fromRootArray($root)
    {
        $this->root = new Node(Node::ROOT);
        $this->importChildren($this->root, $root);

        return $this;
    }

    public function importChildren($node, $array)
    {
        foreach ($array['children'] as $child) {
            $node->addChild(new Node($child['name'], $node));

            if (!empty($child['children'])) {
                $this->importChildren($node->getChild($child['name']), $child);
            }
        }
    }

    public function toArray()
    {
        return $this->root->toArray();
    }

    public function dumpGraph()
    {
        echo $this->root->dumpGraph();
    }

    public function getCleanPathArray($path)
    {
        return array_filter(explode("/", $path), function ($element) {
            return !empty($element);
        });
    }

    public function getTree()
    {
        return $this->root;
    }
}
