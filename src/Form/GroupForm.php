<?php

namespace App\Form;

use App\Entity\Group;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class GroupForm extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Nom du groupe',
                'attr' => [
                    'placeholder' => 'Entrez le nom du groupe'
                ]
            ])
            ->add('role', TextType::class, [
                'label' => 'Rôle',
                'disabled' => true,
                'required' => false,
                'help' => 'Le rôle est généré automatiquement basé sur le nom du groupe',
                'attr' => [
                    'placeholder' => 'ROLE_...'
                ]
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Group::class,
        ]);
    }
}