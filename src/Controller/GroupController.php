<?php
namespace App\Controller;

use App\Entity\Group;
use App\Form\GroupForm;
use App\Repository\GroupRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_ACCESS')]
final class GroupController extends AbstractController
{
    #[Route('/group', name: 'app_group')]
    public function index(GroupRepository $groupRepository): Response
    {
        return $this->render('group/index.html.twig', [
            'groups' => $groupRepository->findAll(),
        ]);
    }

    #[Route('/group/create', name: 'create_group')]
    public function create(Request $request, EntityManagerInterface $em): Response
    {
        // Vérification manuelle avec message d'erreur personnalisé
        if (!$this->isGranted('ROLE_ADMIN')) {
            $this->addFlash('error', 'Vous devez être administrateur pour créer un groupe.');
            return $this->redirectToRoute('app_group');
        }

        $group = new Group();
        $form = $this->createForm(GroupForm::class, $group);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            try {
                // Le rôle est automatiquement généré lors du setName() dans l'entité
                $em->persist($group);
                $em->flush();
                $this->addFlash('success', sprintf('Groupe "%s" créé avec le rôle "%s"', $group->getName(), $group->getRole()));
                
                return $this->redirectToRoute('app_group');
            } catch (\Exception $e) {
                $this->addFlash('error', 'Erreur lors de la création du groupe : ' . $e->getMessage());
            }
        }

        return $this->render('group/form.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    #[Route('/group/edit/{id}', name: 'edit_group')]
    public function edit(Group $group, Request $request, EntityManagerInterface $em): Response
    {
        // Vérification manuelle avec message d'erreur personnalisé
        if (!$this->isGranted('ROLE_ADMIN')) {
            $this->addFlash('error', 'Vous devez être administrateur pour modifier un groupe.');
            return $this->redirectToRoute('app_group');
        }

        $form = $this->createForm(GroupForm::class, $group);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            try {
                // Le rôle sera automatiquement mis à jour si le nom change
                $em->flush();
                $this->addFlash('success', sprintf('Groupe "%s" modifié avec le rôle "%s"', $group->getName(), $group->getRole()));
                
                return $this->redirectToRoute('app_group');
            } catch (\Exception $e) {
                $this->addFlash('error', 'Erreur lors de la modification du groupe : ' . $e->getMessage());
            }
        }

        return $this->render('group/form.html.twig', [
            'form' => $form->createView(),
            'edit' => true,
        ]);
    }

    #[Route('/group/delete/{id}', name: 'delete_group')]
    public function delete(Group $group, EntityManagerInterface $em): Response
    {
        // Vérification manuelle avec message d'erreur personnalisé
        if (!$this->isGranted('ROLE_ADMIN')) {
            $this->addFlash('error', 'Vous devez être administrateur pour supprimer un groupe.');
            return $this->redirectToRoute('app_group');
        }

        try {
            $groupName = $group->getName();
            $em->remove($group);
            $em->flush();
            $this->addFlash('success', sprintf('Groupe "%s" supprimé', $groupName));
        } catch (\Exception $e) {
            $this->addFlash('error', 'Erreur lors de la suppression du groupe : ' . $e->getMessage());
        }
       
        return $this->redirectToRoute('app_group');
    }
}